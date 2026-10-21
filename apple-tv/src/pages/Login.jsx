import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../store/useAuthStore";

const RESEND_SECONDS = 60;
const EMPTY_CODE = ["", "", "", "", "", ""];

const Login = () => {
  const navigate = useNavigate();
  const {
    user,
    authReady,
    pendingEmail,
    loginError,
    onGoogleLogin,
    onEmailAuth,
    onSendVerificationCode,
    onVerifyCode,
    onStartTrial,
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

  // 로그인 완료 후 분기: 구독 중이면 홈, 아니면 3단계 표시
  const routeAfterAuth = (u) => {
    if (isSubscribed(u)) {
      navigate("/", { replace: true });
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
    const u = await onGoogleLogin();
    setBusy(false);
    if (u) routeAfterAuth(u); // 실패 사유는 loginError 로 카드 안에 표시
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

  // 3단계: 7일 무료구독 시작 → 서버가 구독 정보를 기록한 뒤 홈으로
  const handleStartSubscribe = async () => {
    if (busy) return;
    setBusy(true);
    const u = await onStartTrial();
    setBusy(false);
    if (u) navigate("/", { replace: true });
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <main className="login-page">
      <div className={`login-card ${step === "confirm" ? "login-card--confirm" : ""}`}>
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
          <>
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

            <div className="login-google-wrap">
              <button
                type="button"
                className="login-google-btn"
                onClick={handleGoogleLogin}
                disabled={busy}
              >
                구글로 간편 로그인
              </button>
            </div>

            {errorText && (
              <p className="login-error" role="alert">
                {errorText}
              </p>
            )}

            <div className="login-links">
              <button type="button" className="login-link-btn" onClick={toggleMode}>
                {mode === "signin" ? "새 Apple 계정 만들기" : "이미 계정이 있나요? 로그인"}
              </button>
            </div>
          </>
        )}

        {/* ================= STEP 2: 6자리 인증번호 ================= */}
        {step === "code" && (
          <>
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
          </>
        )}

        {/* ================= STEP 3: 구독 안내 (미구독 사용자에게만 표시) ================= */}
        {step === "confirm" && (
          <>
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
                disabled={busy}
              >
                {busy ? "처리 중..." : "7일 무료구독 시작하기"}
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
          </>
        )}
      </div>
    </main>
  );
};

export default Login;
