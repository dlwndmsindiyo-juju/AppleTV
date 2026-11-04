import { create } from "zustand";
import { auth, db, googleProvider, functions } from "../firebase/firebase";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField, Timestamp, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { clearWatchHistory } from "./useWatchStore"; // 이어보기 시청 기록 (users/{uid}/watchHistory)

// 2단계 인증번호: UI 전용 모드
// - true : 이메일 계정 · 구글 계정 모두 6자리 숫자만 입력하면 통과 (메일 발송 없음)
// - false: 이메일 계정은 실제 메일 인증 (Trigger Email 확장 프로그램 설정 필요)
const DEMO_CODE_ONLY = true;

/* ------------------------------------------------------------------ */
/* 공통 유틸                                                           */
/* ------------------------------------------------------------------ */

// [수정] 가족 프로필 4개 고정(아빠 · 엄마 · 아들 · 딸) → OTT 처럼 프로필 추가 방식 (최대 5개)
// - users/{uid}.profiles = [{ id, name, avatar: { icon, color } | null }]
// - 첫 프로필(id "main")은 계정 이름으로 자동 생성 · 이 프로필은 예전 위시리스트 · 시청 기록을 그대로 씀
// - 다른 프로필의 위시리스트 · 시청 기록은 문서 id 앞에 "{프로필 id}__" 를 붙여 따로 저장 (useHeartStore · useWatchStore)
export const PROFILE_MAX = 5;
export const MAIN_PROFILE_ID = "main";
export const PROFILE_NAME_MAX = 20;
const accountName = (u) => u?.name || u?.email?.split("@")[0] || "Apple 사용자";
const newProfiles = (u) => [{ id: MAIN_PROFILE_ID, name: accountName(u), avatar: u?.avatar?.icon ? { icon: u.avatar.icon, color: u.avatar.color } : null }]; // 계정 아이콘은 첫 프로필로

// 저장된 프로필 목록 (예전 계정처럼 없으면 계정 이름으로 1개)
export const getProfiles = (user) =>
    Array.isArray(user?.profiles) && user.profiles.length > 0 ? user.profiles.slice(0, PROFILE_MAX) : newProfiles(user);

// 구독 여부: status 가 active/trial 이고 만료 전이면 true
// (subscription 은 Cloud Functions 만 쓸 수 있는 필드)
export const isSubscribed = (user) => {
    const sub = user?.subscription;
    if (!sub || !["active", "trial"].includes(sub.status)) return false;
    const exp = sub.expiresAt?.toMillis ? sub.expiresAt.toMillis() : sub.expiresAt;
    return !exp || exp > Date.now();
};

// 구독 기간 (UI 전용 구독)
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
const PLAN_DAYS = { monthly: 30, yearly: 365 };

const AUTH_ERRORS = {
    "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
    "auth/missing-password": "비밀번호를 입력해주세요.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
    "auth/email-already-in-use": "이미 가입된 이메일입니다. 로그인해주세요.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/user-not-found": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/user-disabled": "사용이 중지된 계정입니다.",
    "auth/too-many-requests": "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
    "auth/account-exists-with-different-credential":
        "이미 다른 로그인 방식으로 가입된 이메일입니다.",
    "auth/unauthorized-domain":
        "승인되지 않은 도메인입니다. Firebase 콘솔 > Authentication > 설정 > 승인된 도메인에 현재 주소(localhost 등)를 추가하세요.",
    "auth/operation-not-allowed":
        "해당 로그인 방식이 꺼져 있습니다. Firebase 콘솔 > Authentication > 로그인 방법에서 사용 설정하세요.",
    "auth/popup-blocked": "브라우저가 팝업을 차단했습니다. 팝업을 허용한 뒤 다시 시도하세요.",
    "auth/network-request-failed": "네트워크 연결을 확인한 뒤 다시 시도하세요.",
};

const authErrMsg = (err, fallbackLabel) =>
    AUTH_ERRORS[err.code] || `${fallbackLabel} (${err.code || err.message})`;

// Cloud Functions 에러: 서버가 보낸 메시지를 그대로 사용
const fnErrMsg = (err) => {
    if (err.code === "functions/internal" || err.code === "functions/not-found") {
        return "서버 함수를 호출하지 못했습니다. Cloud Functions 배포 상태와 리전을 확인하세요.";
    }
    return err.message || "요청에 실패했습니다. 잠시 후 다시 시도하세요.";
};

// users/{uid} 문서 읽기 (없으면 생성).
// 읽기 실패 시 기본값으로 대체하지 않고 throw → 빈 데이터로 덮어쓰는 사고 방지
const syncUserDoc = async (fbUser) => {
    const ref = doc(db, "users", fbUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();

    const base = {
        uid: fbUser.uid,
        email: fbUser.email ?? null,
        name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "Apple 사용자",
        photoURL: fbUser.photoURL ?? null,
        phone: fbUser.phoneNumber ?? null,
        profiles: [{ id: MAIN_PROFILE_ID, name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "Apple 사용자", avatar: null }],
        // subscription / emailCodeVerified 는 클라이언트가 쓸 수 없음 (서버 전용)
    };
    await setDoc(ref, base);
    return base;
};

// 이메일/비밀번호 계정 → 서버가 기록한 emailCodeVerified 로 판단 (실제 인증)
// 구글 계정           → 2단계 화면은 똑같이 거치되, 6자리만 입력하면 통과 (UI 전용)
//                       통과 여부는 이 브라우저(localStorage)에만 기록하고,
//                       구글 로그인/로그아웃 때마다 초기화 → 로그인할 때마다 2단계가 나옴
const isPasswordOnly = (fbUser) =>
    fbUser.providerData.every((p) => p.providerId === "password");

const demoKey = (uid) => `demoCodeVerified:${uid}`;
const markDemoVerified = (uid) => {
    try {
        localStorage.setItem(demoKey(uid), "1");
    } catch {
        /* 저장 불가 환경이면 새로고침 시 다시 요구됨 */
    }
};
const clearDemoVerified = (uid) => {
    try {
        localStorage.removeItem(demoKey(uid));
    } catch {
        /* noop */
    }
};

// 실제 메일 인증을 쓰는 계정인지 (UI 전용 모드면 항상 false)
const usesRealCode = (fbUser) => !DEMO_CODE_ONLY && isPasswordOnly(fbUser);

// [추가] 확인 코드를 마친 기기(브라우저) 기록 — 이 기기에서는 다음부터 암호만 입력
// - 로그아웃해도 지우지 않음 (다른 기기 · 브라우저 · 시크릿 창에서는 다시 코드 필요)
const trustedKey = (uid) => `trustedDevice:${uid}`;
const isTrustedDevice = (uid) => {
    try {
        // 예전 버전에서 확인 코드를 마치고 로그인 중인 기기(demoCodeVerified)도 인정 → 업데이트 후 로그아웃되지 않게
        return localStorage.getItem(trustedKey(uid)) === "1" || localStorage.getItem(demoKey(uid)) === "1";
    } catch {
        return false;
    }
};
const markTrustedDevice = (uid) => {
    try {
        localStorage.setItem(trustedKey(uid), "1");
    } catch {
        /* 저장 불가 환경이면 다음 로그인 때 다시 코드 */
    }
};

// [수정] 확인 코드가 필요한 경우: 구글 로그인이 "처음 로그인하는 기기"일 때만
// - 이메일 · 암호 로그인(기본 로그인)과 새 계정 만들기는 확인 코드 없이 바로 로그인
// - 구글은 이미 코드를 마친 기기면 통과
const needsCode = (fbUser) => !isPasswordOnly(fbUser) && !isTrustedDevice(fbUser.uid);

// [추가] 이 기기에서 마지막으로 로그인한 계정 (로그인 화면에서 이메일 입력 없이 바로 암호 화면)
const LAST_ACCOUNT_KEY = "lastLoginAccount";
export const loadLastAccount = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(LAST_ACCOUNT_KEY) || "null");
        return saved?.email ? saved : null;
    } catch {
        return null;
    }
};
export const saveLastAccount = (fbUser) => {
    if (!fbUser?.email) return;
    try {
        localStorage.setItem(
            LAST_ACCOUNT_KEY,
            JSON.stringify({
                email: fbUser.email,
                provider: isPasswordOnly(fbUser) ? "password" : "google",
            })
        );
    } catch {
        /* noop */
    }
};
export const clearLastAccount = () => {
    try {
        localStorage.removeItem(LAST_ACCOUNT_KEY);
    } catch {
        /* noop */
    }
};

// [수정] 선택한 프로필 id — 이 기기에 저장 (새로고침해도 유지)
const profileKey = (uid) => `currentProfile:${uid}`;
const loadProfile = (uid, profiles) => {
    try {
        const id = localStorage.getItem(profileKey(uid));
        return profiles.some((p) => p.id === id) ? id : null;
    } catch {
        return null;
    }
};
const saveProfile = (uid, id) => {
    try {
        if (id) localStorage.setItem(profileKey(uid), id);
        else localStorage.removeItem(profileKey(uid));
    } catch {
        /* noop */
    }
};

// [추가] 예전 계정 정리: 가족 프로필 4개(familyMembers) → 프로필 1개(profiles)
const ensureProfiles = async (uid, data) => {
    if (Array.isArray(data?.profiles) && data.profiles.length > 0) return data;
    const profiles = newProfiles(data);
    try {
        await updateDoc(doc(db, "users", uid), { profiles, familyMembers: deleteField() });
    } catch (err) {
        console.log("프로필 정리 에러:", err.code, err.message);
    }
    const next = { ...data, profiles };
    delete next.familyMembers;
    return next;
};

// 인증 세션 → 앱 상태 반영
const applySession = async (fbUser, set) => {
    const data = await ensureProfiles(fbUser.uid, await syncUserDoc(fbUser));
    if (needsCode(fbUser)) {
        set({ user: null, pendingEmail: fbUser.email });
        return { status: "needCode" };
    }
    set({ user: data, pendingEmail: null });
    return { status: "ok", user: data };
};

// ---------- [추가] 계정 설정 (Profile.jsx) ----------
// users/{uid}.settings 기본값 (저장된 값이 없으면 시안 기본값으로 표시)
export const ALERT_CHANNELS = ["email", "sms", "push"]; // 이메일 · 문자 메시지 · 앱 푸시 알림
export const DEFAULT_SETTINGS = {
    autoplayNext: true, // 다음 에피소드 재생
    autoplayRecommend: true, // 추천 항목 재생
    assistant: true, // Apple Assistant 사용
    releaseAlert: { on: true, channels: ["email", "push"] }, // 신규 출시 알림
    sportAlert: { on: true, channels: ["push"] }, // 스포츠 경기 알림
};
export const getSettings = (user) => {
    const saved = user?.settings || {};
    return {
        ...DEFAULT_SETTINGS,
        ...saved,
        releaseAlert: { ...DEFAULT_SETTINGS.releaseAlert, ...saved.releaseAlert },
        sportAlert: { ...DEFAULT_SETTINGS.sportAlert, ...saved.sportAlert },
    };
};

// "모든 브라우저에서 로그아웃" 이후에 로그인했던 세션인지
// - sessionsRevokedAt 보다 먼저 로그인한 브라우저는 다음에 열 때 로그아웃됨
const isSessionRevoked = async (fbUser, data) => {
    const revokedMs = data?.sessionsRevokedAt?.toMillis?.();
    if (!revokedMs) return false;
    try {
        const token = await fbUser.getIdTokenResult();
        return Date.parse(token.authTime) < revokedMs;
    } catch {
        return false;
    }
};

// 구글 팝업 로그인 진행 중에는 onAuthStateChanged 가 세션을 먼저 건드리지 않도록 막음
let googleLoginInFlight = false;
// 이메일 로그인 · 새 계정 만들기도 같은 이유로 막음 (새 계정이 생기자마자 로그아웃되어 "확인 중..."에서 멈추던 문제)
let emailLoginInFlight = false;

/* ------------------------------------------------------------------ */
/* 스토어                                                              */
/* ------------------------------------------------------------------ */

export const useAuthStore = create((set, get) => ({
    user: null,
    authReady: false, // 새로고침 후 로그인 상태 복원이 끝났는지
    currentProfileId: null, // [수정] 지금 보고 있는 프로필 (users/{uid}.profiles 의 id)
    pendingEmail: null,
    loginError: null,

    // [수정] 프로필 선택 → 이 기기에 저장 (새로고침해도 유지)
    onSelectProfile: (id) => {
        if (auth.currentUser) saveProfile(auth.currentUser.uid, id);
        set({ currentProfileId: id });
    },

    // [추가] 프로필 추가 (최대 5개) — { name, avatar } → 새 프로필 id (실패하면 null)
    onAddProfile: async ({ name, avatar = null }) => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev) return null;
        const list = getProfiles(prev);
        const clean = String(name || "").trim().slice(0, PROFILE_NAME_MAX);
        if (!clean || list.length >= PROFILE_MAX) return null;
        const profile = { id: `p${Date.now().toString(36)}`, name: clean, avatar: avatar ? { icon: avatar.icon, color: avatar.color } : null };
        const profiles = [...list, profile];
        set({ user: { ...prev, profiles } });
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { profiles });
            return profile.id;
        } catch (err) {
            console.log("프로필 추가 에러:", err.code, err.message);
            set({ user: prev });
            return null;
        }
    },

    // [추가] 프로필 이름 · 아이콘 바꾸기
    onUpdateProfile: async (id, patch) => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev) return false;
        const profiles = getProfiles(prev).map((p) =>
            p.id === id
                ? {
                    ...p,
                    ...(patch.name !== undefined ? { name: String(patch.name).trim().slice(0, PROFILE_NAME_MAX) || p.name } : {}),
                    ...(patch.avatar !== undefined ? { avatar: patch.avatar ? { icon: patch.avatar.icon, color: patch.avatar.color } : null } : {}),
                }
                : p,
        );
        set({ user: { ...prev, profiles } });
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { profiles });
            return true;
        } catch (err) {
            console.log("프로필 저장 에러:", err.code, err.message);
            set({ user: prev });
            return false;
        }
    },

    // [추가] 프로필 삭제 (첫 프로필은 삭제 불가)
    onDeleteProfile: async (id) => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev || id === MAIN_PROFILE_ID) return false;
        const profiles = getProfiles(prev).filter((p) => p.id !== id);
        set({ user: { ...prev, profiles } });
        if (get().currentProfileId === id) get().onSelectProfile(MAIN_PROFILE_ID);
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { profiles });
            return true;
        } catch (err) {
            console.log("프로필 삭제 에러:", err.code, err.message);
            set({ user: prev });
            return false;
        }
    },
    clearLoginError: () => set({ loginError: null }),

    // 앱 시작 시 1회 호출 (App.jsx) → 새로고침해도 로그인 유지
    initAuth: () =>
        onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) {
                set({ user: null, currentProfileId: null, pendingEmail: null, authReady: true });
                return;
            }
            if (googleLoginInFlight) return; // 방금 누른 구글 로그인은 onGoogleLogin 이 처리
            if (emailLoginInFlight) return; // 방금 누른 이메일 로그인 · 새 계정은 onEmailAuth 가 처리
            try {
                const session = await applySession(fbUser, set);
                // [추가] 다른 브라우저에서 "모든 브라우저에서 로그아웃" 을 누른 뒤라면 이 세션도 종료
                if (session.status === "ok" && (await isSessionRevoked(fbUser, session.user))) {
                    await signOut(auth).catch(() => { });
                    set({ user: null, currentProfileId: null, pendingEmail: null, authReady: true });
                    return;
                }
                // [수정] 이 기기에서 고른 프로필 복원
                if (session.status === "ok") set({ currentProfileId: loadProfile(fbUser.uid, getProfiles(session.user)) });
                // UI 전용 2단계를 마치지 않은 세션은 복원하지 않고 로그인 화면부터 시작
                if (session.status === "needCode" && !usesRealCode(fbUser)) {
                    await signOut(auth).catch(() => { });
                    set({ user: null, currentProfileId: null, pendingEmail: null });
                }
            } catch (err) {
                console.log("세션 복원 에러:", err.code, err.message);
                set({ user: null });
            }
            set({ authReady: true });
        }),

    // 1단계: 이메일/비밀번호 (mode: "signin" | "signup")
    // 반환: { status: "ok", user } | { status: "needCode" } | { status: "error" }
    onEmailAuth: async (mode, email, password) => {
        emailLoginInFlight = true;
        try {
            return await get()._emailAuth(mode, email, password);
        } finally {
            emailLoginInFlight = false;
        }
    },

    _emailAuth: async (mode, email, password) => {
        set({ loginError: null });

        let cred;
        try {
            cred =
                mode === "signup"
                    ? await createUserWithEmailAndPassword(auth, email, password)
                    : await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.log("이메일 인증 에러:", err.code, err.message);
            set({
                loginError: authErrMsg(
                    err,
                    mode === "signup" ? "회원가입에 실패했습니다." : "로그인에 실패했습니다."
                ),
            });
            return { status: "error" };
        }

        // [수정] 이메일 · 암호 로그인은 확인 코드 없음 (needsCode 는 구글만)

        let session;
        try {
            session = await applySession(cred.user, set);
        } catch (err) {
            console.log("사용자 정보 동기화 에러:", err.code, err.message);
            await signOut(auth).catch(() => { });
            set({
                user: null,
                loginError: "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
            });
            return { status: "error" };
        }

        if (session.status === "needCode") {
            // 발송 실패해도 코드 입력 화면으로는 이동 (재전송 가능)
            await get().onSendVerificationCode();
            return { status: "needCode" };
        }
        return session;
    },

    // 2단계-a: 6자리 코드 발송 (서버가 생성·메일 발송)
    onSendVerificationCode: async () => {
        const cur = auth.currentUser;
        if (cur && !usesRealCode(cur)) {
            set({ loginError: null }); // UI 전용: 메일을 보내지 않음
            return true;
        }
        try {
            await httpsCallable(functions, "sendVerificationCode")();
            set({ loginError: null });
            return true;
        } catch (err) {
            console.log("인증번호 발송 에러:", err.code, err.message);
            set({ loginError: fnErrMsg(err) });
            return false;
        }
    },

    // 2단계-b: 6자리 코드 검증 (서버가 검증) → 성공 시 user 반환, 실패 시 null
    onVerifyCode: async (code) => {
        set({ loginError: null });
        try {
            const cur = auth.currentUser;
            if (cur && !usesRealCode(cur)) {
                // UI 전용: 6자리 숫자면 통과
                if (!/^\d{6}$/.test(code)) throw new Error("6자리 숫자를 입력해주세요.");
                markDemoVerified(cur.uid);
            } else {
                await httpsCallable(functions, "verifyVerificationCode")({ code });
            }
            const fbUser = auth.currentUser;
            if (!fbUser) throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
            markTrustedDevice(fbUser.uid); // [추가] 이 기기는 다음부터 암호만 입력
            const data = await syncUserDoc(fbUser); // 서버가 쓴 emailCodeVerified 반영
            set({ user: data, pendingEmail: null });
            return data;
        } catch (err) {
            console.log("인증번호 확인 에러:", err.code, err.message);
            set({ loginError: fnErrMsg(err) });
            return null;
        }
    },

    // 구독 시작 (UI 전용: 결제·Cloud Functions 없이 users/{uid} 에 바로 기록) — plan: "monthly" | "yearly"
    // - 첫 구독: 7일 무료 체험(trial) / 체험 이력 있음: 플랜 기간만큼 active
    // - 계정 문서에 저장되므로 로그아웃 후 다시 로그인해도 구독 상태 유지 → 구독 플로우 안 뜸
    onStartTrial: async (plan) => {
        set({ loginError: null });
        if (!["monthly", "yearly"].includes(plan)) {
            set({ loginError: "플랜을 선택해주세요." });
            return null;
        }
        try {
            const fbUser = auth.currentUser;
            if (!fbUser) throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");

            const current = await syncUserDoc(fbUser);
            if (isSubscribed(current)) {
                set({ user: current }); // 이미 구독 중이면 그대로 통과
                return current;
            }

            const firstTime = !current.trialUsed && !current.subscription;
            const now = Date.now();
            const periodMs = (firstTime ? TRIAL_DAYS : PLAN_DAYS[plan]) * DAY_MS;
            const subscription = {
                status: firstTime ? "trial" : "active",
                plan,
                startedAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(now + periodMs),
            };

            await updateDoc(doc(db, "users", fbUser.uid), { trialUsed: true, subscription });
            const data = { ...current, trialUsed: true, subscription };
            set({ user: data });
            return data;
        } catch (err) {
            console.log("무료구독 시작 에러:", err.code, err.message);
            set({ loginError: fnErrMsg(err) });
            return null;
        }
    },

    // 구글 로그인
    // 반환: { status: "ok", user } | { status: "needCode" } | { status: "cancel" | "error" }
    onGoogleLogin: async () => {
        googleLoginInFlight = true;
        try {
            return await get()._googleLogin();
        } finally {
            googleLoginInFlight = false;
        }
    },

    _googleLogin: async () => {
        set({ loginError: null });

        let gUser;
        try {
            const result = await signInWithPopup(auth, googleProvider);
            gUser = result.user;
        } catch (err) {
            console.log("구글 로그인 에러:", err.code, err.message);
            if (
                err.code === "auth/popup-closed-by-user" ||
                err.code === "auth/cancelled-popup-request"
            ) {
                return { status: "cancel" };
            }
            set({ loginError: authErrMsg(err, "구글 로그인에 실패했습니다.") });
            return { status: "error" };
        }

        // [수정] 구글 계정: 처음 로그인하는 기기에서만 확인 코드 (needsCode · isTrustedDevice)

        try {
            return await applySession(gUser, set);
        } catch (err) {
            // 사용자 문서를 못 읽었는데 로그인 처리하면 빈 데이터로 덮어쓸 수 있음 → 로그아웃
            console.log("Firestore 동기화 에러:", err.code, err.message);
            await signOut(auth).catch(() => { });
            set({
                user: null,
                loginError: "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
            });
            return { status: "error" };
        }
    },

    // ---------- [추가] 계정 설정 ----------
    // 설정 한 항목 저장 (key: autoplayNext | autoplayRecommend | assistant | releaseAlert | sportAlert)
    // 화면은 바로 바꾸고, 저장에 실패하면 원래 값으로 되돌림 → true / false 반환
    onUpdateSetting: async (key, value) => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev || !(key in DEFAULT_SETTINGS)) return false;
        set({ user: { ...prev, settings: { ...prev.settings, [key]: value } } });
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { [`settings.${key}`]: value });
            return true;
        } catch (err) {
            console.log("설정 저장 에러:", err.code, err.message);
            set({ user: prev });
            return false;
        }
    },

    // 프로필 아이콘 저장 — avatar: { icon, color }
    onUpdateAvatar: async (avatar) => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev) return false;
        const next = { icon: avatar.icon, color: avatar.color };
        set({ user: { ...prev, avatar: next } });
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { avatar: next });
            return true;
        } catch (err) {
            console.log("프로필 아이콘 저장 에러:", err.code, err.message);
            set({ user: prev });
            return false;
        }
    },

    // [수정] 재생 기록 지우기: 지금 보고 있는 프로필의 시청 기록만 비움
    onClearWatchHistory: async () => {
        const fbUser = auth.currentUser;
        if (!fbUser || !get().user) return false;
        try {
            await clearWatchHistory(fbUser.uid, get().currentProfileId || MAIN_PROFILE_ID);
            return true;
        } catch (err) {
            console.log("재생 기록 삭제 에러:", err.code, err.message);
            return false;
        }
    },

    // 모든 브라우저에서 로그아웃: 기준 시각을 기록하고 이 브라우저도 로그아웃
    // (다른 브라우저는 다음에 사이트를 열 때 initAuth 에서 로그아웃됨)
    onLogoutEverywhere: async () => {
        const fbUser = auth.currentUser;
        if (!fbUser) return false;
        try {
            await updateDoc(doc(db, "users", fbUser.uid), { sessionsRevokedAt: serverTimestamp() });
        } catch (err) {
            console.log("모든 브라우저 로그아웃 에러:", err.code, err.message);
            return false;
        }
        await get().onLogout();
        return true;
    },

    // 로그아웃
    onLogout: async () => {
        try {
            if (auth.currentUser) clearDemoVerified(auth.currentUser.uid);
            await signOut(auth);
        } catch (err) {
            console.log("로그아웃 에러:", err.message);
        }
        set({ user: null, currentProfileId: null, pendingEmail: null, loginError: null });
    },
}));