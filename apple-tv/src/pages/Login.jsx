import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuthStore, isSubscribed } from "../store/useAuthStore";

const RESEND_SECONDS = 60;
const EMPTY_CODE = ["", "", "", "", "", ""];

// 로그인 후 돌아갈 수 없는 경로 (로그인 / 구독 화면 자체)
const AUTH_PATHS = ["/login", "/subscribe"];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 → 구독 흐름 정보 (진입한 버튼에서 state 로 전달)
  // - from: 로그인 전에 있던 화면 → 로그인/구독이 끝나면 그 화면으로 복귀
  // - intent: "subscribe" → "무료 체험" 버튼으로 들어온 경우, 인증 완료 안내를 건너뛰고 바로 플랜 선택으로
  const from = AUTH_PATHS.includes(location.state?.from) ? "/" : location.state?.from || "/";
  const wantsSubscribe = location.state?.intent === "subscribe";
  const {
    user,
    authReady,
    pendingEmail,
    loginError,
    onGoogleLogin,
    onEmailAuth,
    onSendVerificationCode,
    onVerifyCode,
    onLogout,
    clearLoginError,
  } = useAuthStore();

  // step: "login" (1단계) | "code" (2단계) | "confirm" (3단계: 구독 안내)
  const [step, setStep] = useState("login");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");

  // 2단계 6자리 인증번호 상태 및 포커스 제어
  const [code, setCode] = useState(EMPTY_CODE);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  const errorText = localError || loginError;

  // 플랜 선택 화면으로 (뒤로 가기 시 로그인 화면이 다시 나오지 않도록 replace)
  const goSubscribe = () => {
    navigate("/subscribe", { replace: true, state: { from } });
  };

  // 로그인 완료 후 분기
  // - 이미 구독 중: 원래 있던 화면으로 바로 복귀
  // - 무료 체험 버튼으로 진입: 안내 단계 없이 바로 플랜 선택
  // - 그 외: 3단계(인증 완료 · 무료구독 안내) 표시
  const routeAfterAuth = (u) => {
    if (isSubscribed(u)) {
      navigate(from, { replace: true });
    } else if (wantsSubscribe) {
      goSubscribe();
    } else {
      setStep("confirm");
    }
  };

  // 이미 로그인된 상태로 진입 / 새로고침 후 복원 시에도 같은 규칙 적용
  useEffect(() => {
    if (authReady && user) routeAfterAuth(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  // 코드 입력 도중 새로고침한 경우: 인증 대기 상태면 2단계로 복귀
  useEffect(() => {
    if (authReady && !user && pendingEmail && step === "login") {
      setStep("code");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user, pendingEmail]);

  // 재전송 쿨다운 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resetCode = () => {
    setCode(EMPTY_CODE);
    setLocalError("");
  };

  // 구글 로그인
  const handleGoogleLogin = async () => {
    if (busy) return;
    setBusy(true);
    setLocalError("");
    const res = await onGoogleLogin();
    setBusy(false);

    if (res.status === "needCode") {
      // 구글도 2단계(6자리) 화면을 거침 (UI 전용: 6자리 입력 시 통과)
      resetCode();
      setCooldown(RESEND_SECONDS);
      setNotice("");
      setStep("code");
    } else if (res.status === "ok") {
      routeAfterAuth(res.user);
    } // cancel / error: 실패 사유는 loginError 로 카드 안에 표시
  };

  // 1단계: 이메일/비밀번호 로그인 또는 가입
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || busy) return;
    setLocalError("");
    setBusy(true);
    const res = await onEmailAuth(mode, email.trim(), password);
    setBusy(false);

    if (res.status === "needCode") {
      resetCode();
      setCooldown(RESEND_SECONDS);
      setNotice("");
      setStep("code");
    } else if (res.status === "ok") {
      routeAfterAuth(res.user);
    }
  };

  // 비밀번호 찾기: 입력한 이메일로 Firebase 재설정 메일 발송
  const handleResetPassword = async () => {
    if (busy) return;
    clearLoginError();
    if (!email.trim()) {
      setNotice("");
      setLocalError("비밀번호를 재설정할 이메일을 먼저 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setLocalError("");
      setNotice("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.");
    } catch (err) {
      console.log("비밀번호 재설정 에러:", err.code, err.message);
      setNotice("");
      setLocalError(
        err.code === "auth/invalid-email"
          ? "이메일 형식이 올바르지 않습니다."
          : "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    }
    setBusy(false);
  };

  const toggleMode = () => {
    clearLoginError();
    setLocalError("");
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  };

  // 6자리 입력 칸 제어 (자동 포커스 이동)
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setLocalError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 백스페이스 키 입력 시 이전 칸 이동
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 6자리 붙여넣기 지원
  const handleCodePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = [...EMPTY_CODE];
    digits.split("").forEach((d, i) => (next[i] = d));
    setCode(next);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // 2단계: 서버에서 코드 검증
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setLocalError("6자리 인증번호를 모두 입력해주세요.");
      return;
    }

    setBusy(true);
    const u = await onVerifyCode(fullCode);
    setBusy(false);

    if (u) {
      setNotice("");
      routeAfterAuth(u); // 구독 여부에 따라 홈 또는 3단계
    } else {
      setCode(EMPTY_CODE);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    const ok = await onSendVerificationCode();
    setBusy(false);
    if (ok) {
      resetCode();
      setCooldown(RESEND_SECONDS);
      setNotice("인증번호를 재전송했습니다.");
      inputRefs.current[0]?.focus();
    } else {
      setNotice("");
    }
  };

  // 다른 이메일 사용: 인증 세션 정리 후 1단계로
  const handleOtherEmail = async () => {
    await onLogout();
    resetCode();
    setNotice("");
    setPassword("");
    setStep("login");
  };

  // 3단계: 플랜 선택 페이지로 이동 (실제 구독 기록은 /subscribe 의 "계속"에서)
  const handleStartSubscribe = () => {
    goSubscribe();
  };

  // 닫기 / 나중에: 로그인 전에 있던 화면으로
  const handleClose = () => {
    navigate(from, { replace: true });
  };

  return (
    <main className="login-page">
      <div
        className={`login-card ${step === "confirm" ? "login-card--confirm" : ""} ${step === "login" ? "login-card--signin" : ""}`}
      >
        {/* 카드 안쪽 좌측 상단 닫기(X) 버튼 */}
        <button
          type="button"
          className="login-card-close"
          onClick={handleClose}
          aria-label="닫기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 상단 회색 라운드 로고 영역 */}
        <div className="login-logo-area">
          <div className="login-app-icon" />
        </div>

        {/* ================= STEP 1: 로그인 / 가입 ================= */}
        {step === "login" && (
          <div className="login-step" key="login">
            <h2 className="login-title">
              {mode === "signin" ? "로그인" : "새 Apple 계정 만들기"}
            </h2>
            <p className="login-desc">
              {mode === "signin"
                ? "Apple 계정으로 Apple TV를 이용하세요."
                : "이메일과 비밀번호(6자 이상)로 계정을 만드세요."}
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-field">
                <input
                  type="email"
                  placeholder="이메일"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <input
                  type="password"
                  placeholder="비밀번호"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={busy}>
                {busy ? "확인 중..." : mode === "signin" ? "계속" : "가입하고 계속"}
              </button>
            </form>

            {notice && !errorText && <p className="login-notice">{notice}</p>}
            {errorText && (
              <p className="login-error" role="alert">
                {errorText}
              </p>
            )}

            {/* 하단 링크: [구글 간편 로그인 | 비밀번호를 잊으셨나요?] / 새 Apple 계정 만들기 */}
            <div className="login-links">
              <div className="login-links-row">
                <button
                  type="button"
                  className="login-link-btn login-google-btn"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                >
                  <svg className="login-google-icon" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  구글 계정으로 로그인
                </button>
                {mode === "signin" && (
                  <button type="button" className="login-link-btn" onClick={handleResetPassword} disabled={busy}>
                    비밀번호를 잊으셨나요?
                  </button>
                )}
              </div>
              <button type="button" className="login-link-btn" onClick={toggleMode}>
                {mode === "signin" ? "새 Apple 계정 만들기" : "이미 계정이 있나요? 로그인"}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: 6자리 인증번호 ================= */}
        {step === "code" && (
          <div className="login-step" key="code">
            <h2 className="login-title">인증번호를 보냈습니다.</h2>
            <p className="login-desc">
              <strong>{pendingEmail || email}</strong> 으로 6자리 인증번호를 보냈습니다.
              <br />
              메일함에서 확인 후 아래에 입력하세요. (5분 이내)
            </p>

            <form className="login-form" onSubmit={handleVerifySubmit}>
              <div className="code-input-group" onPaste={handleCodePaste}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="code-box"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button type="submit" className="login-btn" disabled={busy}>
                {busy ? "확인 중..." : "인증하고 계속"}
              </button>
            </form>

            {notice && !errorText && <p className="login-notice">{notice}</p>}
            {errorText && (
              <p className="login-error" role="alert">
                {errorText}
              </p>
            )}

            <div className="login-links row-links">
              <button
                type="button"
                className="login-link-btn"
                onClick={handleResend}
                disabled={cooldown > 0 || busy}
              >
                {cooldown > 0 ? `인증번호 재전송 (${cooldown}초)` : "인증번호 재전송"}
              </button>
              <button type="button" className="login-link-btn" onClick={handleOtherEmail}>
                다른 이메일 사용
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: 구독 안내 (미구독 사용자에게만 표시) ================= */}
        {step === "confirm" && (
          <div className="login-step" key="confirm">
            <h2 className="login-title">인증 완료</h2>
            <p className="login-desc">
              로그인이 완료되었습니다.
              <br />
              이제 Apple TV를 이용할 수 있습니다.
            </p>

            <div className="login-form">
              <button
                type="button"
                className="login-btn"
                onClick={handleStartSubscribe}
              >
                7일 무료구독 시작하기
              </button>
            </div>

            {errorText && (
              <p className="login-error" role="alert">
                {errorText}
              </p>
            )}

            <div className="login-links row-links">
              <button
                type="button"
                className="login-link-btn"
                onClick={() => alert("고객센터로 연결합니다.")}
              >
                문제가 있나요?
              </button>
              <button type="button" className="login-link-btn" onClick={handleClose}>
                나중에
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Login;
