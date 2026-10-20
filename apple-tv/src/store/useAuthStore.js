import { create } from "zustand";
import { auth, db, googleProvider } from "../firebase/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useAuthStore = create((set, get) => ({
    user: null,
    currentMember: null,
    pendingEmail: null,
    loginError: null, // [추가] 로그인 실패 사유 (화면 안내용)

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
        set({ loginError: null });

        // 1. 구글 팝업 인증 (여기서 실패하면 로그인 실패)
        let gUser;
        try {
            const result = await signInWithPopup(auth, googleProvider);
            gUser = result.user;
        } catch (err) {
            console.log("구글 로그인 에러:", err.code, err.message);

            // 사용자가 직접 팝업을 닫은 경우는 안내 없이 종료
            if (
                err.code === "auth/popup-closed-by-user" ||
                err.code === "auth/cancelled-popup-request"
            ) {
                return null;
            }

            const messages = {
                "auth/unauthorized-domain":
                    "승인되지 않은 도메인입니다. Firebase 콘솔 > Authentication > 설정 > 승인된 도메인에 현재 주소(localhost 등)를 추가하세요.",
                "auth/operation-not-allowed":
                    "Google 로그인이 꺼져 있습니다. Firebase 콘솔 > Authentication > 로그인 방법에서 Google 을 사용 설정하세요.",
                "auth/popup-blocked":
                    "브라우저가 팝업을 차단했습니다. 팝업을 허용한 뒤 다시 시도하세요.",
                "auth/network-request-failed":
                    "네트워크 연결을 확인한 뒤 다시 시도하세요.",
            };
            set({
                loginError:
                    messages[err.code] ||
                    `구글 로그인에 실패했습니다. (${err.code || err.message})`,
            });
            return null;
        }

        // 2. 기본 사용자 정보 (undefined 값은 Firestore 저장 시 에러라서 null 로 대체)
        const userInfo = {
            uid: gUser.uid,
            email: gUser.email ?? null,
            name: gUser.displayName ?? "Apple 사용자",
            photoURL: gUser.photoURL ?? null,
            phone: gUser.phoneNumber ?? null,
            familyMembers: {
                아빠: { likes: [], watchHistory: [] },
                엄마: { likes: [], watchHistory: [] },
                아들: { likes: [], watchHistory: [] },
                딸: { likes: [], watchHistory: [] },
            },
        };

        // 3. Firestore 동기화 — 실패해도 로그인은 유지 (규칙/설정 문제로 막히지 않게)
        let finalUser = userInfo;
        try {
            const userRef = doc(db, "users", gUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                finalUser = userDoc.data();
            } else {
                await setDoc(userRef, userInfo);
            }
        } catch (fbErr) {
            console.log("Firestore 경고 (로그인은 계속 진행):", fbErr.code, fbErr.message);
        }

        set({ user: finalUser });
        return finalUser;
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