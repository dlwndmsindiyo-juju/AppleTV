import { create } from "zustand";
import { auth, db, googleProvider, functions } from "../firebase/firebase";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

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

// 이메일/비밀번호 계정은 6자리 코드로 이메일 인증을 마쳐야 로그인 완료
// (구글 계정은 구글이 이메일을 이미 검증하므로 제외)
const needsCode = (fbUser, data) =>
    fbUser.providerData.every((p) => p.providerId === "password") &&
    !data.emailCodeVerified;

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
            try {
                await applySession(fbUser, set);
            } catch (err) {
                console.log("세션 복원 에러:", err.code, err.message);
                set({ user: null });
            }
            set({ authReady: true });
        }),

    // 1단계: 이메일/비밀번호 (mode: "signin" | "signup")
    // 반환: { status: "ok", user } | { status: "needCode" } | { status: "error" }
    onEmailAuth: async (mode, email, password) => {
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

        let session;
        try {
            session = await applySession(cred.user, set);
        } catch (err) {
            console.log("사용자 정보 동기화 에러:", err.code, err.message);
            await signOut(auth).catch(() => {});
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
            await httpsCallable(functions, "verifyVerificationCode")({ code });
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

    // 3단계: 7일 무료구독 시작 (서버가 subscription 필드를 기록)
    onStartTrial: async () => {
        set({ loginError: null });
        try {
            await httpsCallable(functions, "startTrial")();
            const fbUser = auth.currentUser;
            const data = await syncUserDoc(fbUser);
            set({ user: data });
            return data;
        } catch (err) {
            console.log("무료구독 시작 에러:", err.code, err.message);
            set({ loginError: fnErrMsg(err) });
            return null;
        }
    },

    // 구글 로그인
    onGoogleLogin: async () => {
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
                return null;
            }
            set({ loginError: authErrMsg(err, "구글 로그인에 실패했습니다.") });
            return null;
        }

        try {
            const session = await applySession(gUser, set);
            return session.status === "ok" ? session.user : null;
        } catch (err) {
            // 사용자 문서를 못 읽었는데 로그인 처리하면 빈 데이터로 덮어쓸 수 있음 → 로그아웃
            console.log("Firestore 동기화 에러:", err.code, err.message);
            await signOut(auth).catch(() => {});
            set({
                user: null,
                loginError: "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
            });
            return null;
        }
    },

    // 로그아웃
    onLogout: async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.log("로그아웃 에러:", err.message);
        }
        set({ user: null, currentMember: null, pendingEmail: null, loginError: null });
    },
}));
