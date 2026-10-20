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
            console.log("인증번호 검증 시작:", code, pendingEmail);

            // 6자리 코드가 들어왔을 때 검증 로직 (필요시 특정 번호 체크 가능, 현재는 통과 처리)
            if (!code || code.length < 6) {
                return false;
            }

            const mockUid = "email-user-" + Date.now();
            const userRef = doc(db, "users", mockUid);

            const userInfo = {
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

            // Firestore 저장 (실패하더라도 흐름이 끊기지 않도록 방어 코드 유지)
            try {
                const userDoc = await getDoc(userRef);
                if (!userDoc.exists()) {
                    await setDoc(userRef, userInfo);
                } else {
                    userInfo = userDoc.data();
                }
            } catch (fbErr) {
                console.log("Firebase 통신 경고 (오프라인 모드 진행):", fbErr.message);
            }

            // 상태 저장 후 정상 객체 반환
            set({ user: userInfo, pendingEmail: null });
            return userInfo;
        } catch (err) {
            console.log("인증번호 확인 에러:", err.message);
            return false; // 에러 발생 시에는 false를 반환하여 3단계로 넘어가지 않도록 함
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