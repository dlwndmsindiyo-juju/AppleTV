import { create } from "zustand";
import { auth, db, googleProvider } from "../firebase/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useAuthStore = create((set, get) => ({
    user: null,
    currentMember: null,
    pendingEmail: null,

    onSetMember: (member) => {
        set({ currentMember: member });
    },

    // 1단계: 이메일 인증번호 발송 요청
    onSendVerificationCode: async (email, password) => {
        try {
            console.log("인증번호 발송:", email);
            set({ pendingEmail: email });
            return true;
        } catch (err) {
            console.log("인증번호 발송 에러:", err.message);
            return false;
        }
    },

    // 2단계: 인증번호 검증
    onVerifyCode: async (code) => {
        try {
            const { pendingEmail } = get();
            console.log("인증번호 검증:", code, pendingEmail);

            const mockUid = "email-user-" + Date.now();
            const userRef = doc(db, "users", mockUid);
            const userDoc = await getDoc(userRef);

            let userInfo;
            if (!userDoc.exists()) {
                userInfo = {
                    uid: mockUid,
                    email: pendingEmail || "Apple@apple.com",
                    name: "Apple 사용자",
                    familyMembers: {
                        아빠: { likes: [], watchHistory: [] },
                        엄마: { likes: [], watchHistory: [] },
                        아들: { likes: [], watchHistory: [] },
                        딸: { likes: [], watchHistory: [] },
                    }
                };
                await setDoc(userRef, userInfo);
            } else {
                userInfo = userDoc.data();
            }

            set({ user: userInfo, pendingEmail: null });
            return userInfo;
        } catch (err) {
            console.log("인증번호 확인 에러:", err.message);
            return false;
        }
    },

    // 구글 로그인
    onGoogleLogin: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                const userInfo = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    phone: user.phoneNumber,
                    familyMembers: {
                        아빠: { likes: [], watchHistory: [] },
                        엄마: { likes: [], watchHistory: [] },
                        아들: { likes: [], watchHistory: [] },
                        딸: { likes: [], watchHistory: [] },
                    }
                };
                await setDoc(userRef, userInfo);
                set({ user: userInfo });
                return userInfo;
            } else {
                set({ user: userDoc.data() });
                return userDoc.data();
            }
        } catch (err) {
            console.log("구글 로그인 에러:", err.message);
        }
    },

    // 로그아웃
    onLogout: async () => {
        try {
            await signOut(auth);
            set({ user: null, currentMember: null, pendingEmail: null });
        } catch (err) {
            console.log("로그아웃 에러:", err.message);
        }
    }
}));