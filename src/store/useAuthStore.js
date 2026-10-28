import { create } from "zustand";
import { auth, db, googleProvider, functions } from "../firebase/firebase";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { clearWatchHistory } from "./useWatchStore"; // 이어보기 시청 기록 (users/{uid}/watchHistory)

// 2단계 인증번호: UI 전용 모드
// - true : 이메일 계정 · 구글 계정 모두 6자리 숫자만 입력하면 통과 (메일 발송 없음)
// - false: 이메일 계정은 실제 메일 인증 (Trigger Email 확장 프로그램 설정 필요)
const DEMO_CODE_ONLY = true;

/* ------------------------------------------------------------------ */
/* 공통 유틸                                                           */
/* ------------------------------------------------------------------ */

const newFamilyMembers = () => ({
    아빠: { likes: [], watchHistory: [] },
    엄마: { likes: [], watchHistory: [] },
    아들: { likes: [], watchHistory: [] },
    딸: { likes: [], watchHistory: [] },
});

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
        familyMembers: newFamilyMembers(),
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
const isDemoVerified = (uid) => {
    try {
        return localStorage.getItem(demoKey(uid)) === "1";
    } catch {
        return false;
    }
};
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

const needsCode = (fbUser, data) =>
    usesRealCode(fbUser) ? !data.emailCodeVerified : !isDemoVerified(fbUser.uid);

// 인증 세션 → 앱 상태 반영
const applySession = async (fbUser, set) => {
    const data = await syncUserDoc(fbUser);
    if (needsCode(fbUser, data)) {
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
    currentMember: null,
    pendingEmail: null,
    loginError: null,

    onSetMember: (member) => set({ currentMember: member }),
    clearLoginError: () => set({ loginError: null }),

    // 앱 시작 시 1회 호출 (App.jsx) → 새로고침해도 로그인 유지
    initAuth: () =>
        onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) {
                set({ user: null, currentMember: null, pendingEmail: null, authReady: true });
                return;
            }
            if (googleLoginInFlight) return; // 방금 누른 구글 로그인은 onGoogleLogin 이 처리
            if (emailLoginInFlight) return; // 방금 누른 이메일 로그인 · 새 계정은 onEmailAuth 가 처리
            try {
                const session = await applySession(fbUser, set);
                // [추가] 다른 브라우저에서 "모든 브라우저에서 로그아웃" 을 누른 뒤라면 이 세션도 종료
                if (session.status === "ok" && (await isSessionRevoked(fbUser, session.user))) {
                    await signOut(auth).catch(() => { });
                    set({ user: null, currentMember: null, pendingEmail: null, authReady: true });
                    return;
                }
                // UI 전용 2단계를 마치지 않은 세션은 복원하지 않고 로그인 화면부터 시작
                if (session.status === "needCode" && !usesRealCode(fbUser)) {
                    await signOut(auth).catch(() => { });
                    set({ user: null, currentMember: null, pendingEmail: null });
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

        // UI 전용 모드: 로그인할 때마다 2단계 화면을 거치도록 초기화 (구글과 동일)
        if (!usesRealCode(cred.user)) clearDemoVerified(cred.user.uid);

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

        clearDemoVerified(gUser.uid); // 구글 로그인할 때마다 2단계 인증을 거치도록 초기화

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

    // 재생 기록 지우기: 이어보기 시청 기록(users/{uid}/watchHistory) + 가족 프로필별 watchHistory 를 모두 비움
    onClearWatchHistory: async () => {
        const fbUser = auth.currentUser;
        const prev = get().user;
        if (!fbUser || !prev) return false;
        const members = prev.familyMembers || newFamilyMembers();
        const cleared = Object.fromEntries(
            Object.entries(members).map(([name, m]) => [name, { ...m, watchHistory: [] }]),
        );
        try {
            await clearWatchHistory(fbUser.uid);
            await updateDoc(doc(db, "users", fbUser.uid), { familyMembers: cleared });
            set({ user: { ...get().user, familyMembers: cleared } });
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
        set({ user: null, currentMember: null, pendingEmail: null, loginError: null });
    },
}));