// src/pages/Login.jsx
// 로그인 플로우 (시안)
// 1. 이메일로 계속 → 2-a. Apple 계정 확인 (암호 · 확인 코드)  /  2-b. Apple 계정 생성
//   → 로그인 완료: 구독 중이면 "이미 이용 중", 아니면 플랜 선택(/subscribe)으로 이어짐
//   → 실패하면 "로그인할 수 없습니다"
// - 로그인이 끝난 계정이 /login 으로 다시 들어오면 화면을 보여주지 않고 바로 이동
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuthStore, isSubscribed } from "../store/useAuthStore";
import { MANAGE_URL } from "../data/appleLinks";
// 로그인 · 구독 카드 스타일(.auth-*)은 App.scss 맨 아래에 있음

// =====================================================================
// 로그인 · 구독 공용 카드 조각 (Subscribe.jsx 에도 같은 코드가 있음 — 바꿀 때 함께 수정)
// =====================================================================
// 외부(Apple 공식) 링크 — 주소가 바뀌면 여기만 수정
const APPLE_LINKS = {
  privacy: "https://www.apple.com/kr/legal/privacy/",
  recover: "https://iforgot.apple.com/",
  watch: "https://tv.apple.com/kr",
  manage: MANAGE_URL, // 무료 체험 안내(TrialWelcome)와 같은 구독 관리 주소
};

// 카드 껍데기: 닫기 버튼 + 로고(public/icons/header-icon.svg) + 단계별 내용
// stepKey 가 바뀔 때마다 내용이 아래에서 살짝 올라오며 나타남
const AuthCard = ({ wide = false, onClose, stepKey, children }) => (
  <main className="auth-page page-fade">
    <div className={`auth-card${wide ? " auth-card--wide" : ""}`}>
      <button type="button" className="auth-close" onClick={onClose}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        닫기
      </button>

      <div className="auth-logo">
        <img src="/icons/header-icon.svg" alt="Apple TV" />
      </div>

      <div className="auth-step" key={stepKey}>
        {children}
      </div>
    </div>
  </main>
);

// 제목 + 설명
const AuthHead = ({ title, desc }) => (
  <>
    <h2 className="auth-title">{title}</h2>
    {desc && <p className="auth-desc">{desc}</p>}
  </>
);

// 라벨이 위에 붙은 입력 칸 (children 에 input, 또는 value 로 읽기 전용 값)
const AuthField = ({ label, value, children }) => (
  <label className="auth-field">
    <span className="auth-field-label">{label}</span>
    {children ?? <span className="auth-field-value">{value}</span>}
  </label>
);

// 회색 안내 박스 (제목 + 설명 여러 줄)
const AuthInfo = ({ title, lines = [] }) => (
  <div className="auth-info">
    <strong>{title}</strong>
    {lines.map((line) => (
      <p key={line}>{line}</p>
    ))}
  </div>
);

// 바깥 링크 (새 창 · ↗)
const ExternalLink = ({ href, className = "auth-link", children }) => (
  <a className={className} href={href} target="_blank" rel="noopener noreferrer">
    {children} <span className="ui-icon ui-icon-external" aria-hidden="true" />
  </a>
);


// 로그인 후 돌아갈 수 없는 경로 (로그인 / 구독 화면 자체)
const AUTH_PATHS = ["/login", "/subscribe"];
const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = AUTH_PATHS.includes(location.state?.from) ? "/" : location.state?.from || "/";

  const {
    user,
    authReady,
    pendingEmail,
    onEmailAuth,
    onGoogleLogin,
    onSendVerificationCode,
    onVerifyCode,
    onLogout,
    clearLoginError,
  } = useAuthStore();

  // step: "email" | "verify" | "create" | "error" | "already"
  const [step, setStep] = useState("email");
  const [mode, setMode] = useState("signin"); // verify 단계: "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorText, setErrorText] = useState("");

  const [cooldown, setCooldown] = useState(0); // 확인 코드 재전송 대기(초)
  const codeRef = useRef(null);

  // 재전송 대기 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const enteredChecked = useRef(false); // 처음 들어왔을 때 1번만 검사
  const flowStarted = useRef(false); // 이 화면에서 로그인을 진행했는지

  // ---------- 로그인이 끝난 상태로 들어오면 이 화면을 보여주지 않음 ----------
  useEffect(() => {
    if (!authReady || enteredChecked.current) return;
    enteredChecked.current = true;
    if (user) {
      if (isSubscribed(user)) navigate(from, { replace: true });
      else navigate("/subscribe", { replace: true, state: { from } });
    } else if (pendingEmail) {
      // 확인 코드 입력 도중 새로고침한 경우: 계정 확인 단계로 복귀
      setEmail(pendingEmail);
      setStep("verify");
      setNotice("메일로 받은 6자리 확인 코드를 입력하세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  // 로그인 완료 후: 구독 중이면 안내, 아니면 바로 플랜 선택으로
  const finish = (u) => {
    if (isSubscribed(u)) {
      setStep("already");
    } else {
      navigate("/subscribe", { replace: true, state: { from } });
    }
  };

  const showError = (message) => {
    setErrorText(message || "이메일 형식 또는 계정 정보를 확인해 주세요.");
    setNotice("");
    setStep("error");
  };

  const resetSecrets = () => {
    setPassword("");
    setCode("");
    setNotice("");
    clearLoginError();
  };

  // ---------- 1. 이메일로 계속 ----------
  // 가입된 이메일이면 계정 확인, 아니면 계정 생성 안내
  const continueWithEmail = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setEmail(trimmed);
    resetSecrets();

    if (!EMAIL_RE.test(trimmed)) {
      showError("이메일 형식 또는 계정 정보를 확인해 주세요.");
      return;
    }

    setBusy(true);
    let methods = [];
    try {
      methods = await fetchSignInMethodsForEmail(auth, trimmed);
    } catch (err) {
      console.log("이메일 확인 에러:", err.code, err.message);
    }
    setBusy(false);

    if (methods.length > 0) {
      setMode("signin");
      setStep("verify");
    } else {
      setStep("create");
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    continueWithEmail(email);
  };

  // ---------- 2-a. Apple 계정 확인 (암호 → 필요하면 확인 코드) ----------
  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setNotice("메일로 받은 6자리 확인 코드를 입력하세요.");
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    const u = await onVerifyCode(code);
    setBusy(false);
    if (u) finish(u);
    else showError(useAuthStore.getState().loginError || "확인 코드가 올바르지 않습니다.");
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    flowStarted.current = true;

    // 이미 암호 확인을 마치고 코드만 남은 상태
    if (pendingEmail && !user) {
      await verifyCode();
      return;
    }

    if (password.length < 6) {
      setNotice(mode === "signup" ? "암호는 6자 이상 입력하세요." : "암호를 입력하세요.");
      return;
    }

    setBusy(true);
    const res = await onEmailAuth(mode, email, password);
    setBusy(false);

    if (res.status === "ok") {
      finish(res.user);
    } else if (res.status === "needCode") {
      setCooldown(RESEND_SECONDS);
      if (/^\d{6}$/.test(code)) {
        await verifyCode();
      } else {
        setNotice("메일로 6자리 확인 코드를 보냈습니다. 코드를 입력하고 다시 눌러 주세요.");
        codeRef.current?.focus();
      }
    } else {
      showError(useAuthStore.getState().loginError);
    }
  };

  // ---------- 구글 계정으로 계속 (firebase.js 의 googleProvider) ----------
  // 구글도 확인 코드 단계를 거침 → 코드 입력 화면(Apple 계정 확인)으로
  const handleGoogleLogin = async () => {
    if (busy) return;
    flowStarted.current = true;
    resetSecrets();
    setBusy(true);
    const res = await onGoogleLogin();
    setBusy(false);

    if (res.status === "ok") {
      finish(res.user);
    } else if (res.status === "needCode") {
      setEmail(useAuthStore.getState().pendingEmail || "");
      setMode("signin");
      setCooldown(RESEND_SECONDS);
      setNotice("본인 확인을 위해 6자리 확인 코드를 입력하세요.");
      setStep("verify");
    } else if (res.status === "error") {
      showError(useAuthStore.getState().loginError);
    } // cancel: 팝업을 닫은 경우 그대로 둠
  };

  // ---------- 확인 코드 다시 보내기 (firebase.js 의 functions) ----------
  const handleResendCode = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    const ok = await onSendVerificationCode();
    setBusy(false);
    if (ok) {
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice("확인 코드를 다시 보냈습니다. 메일함을 확인해 주세요.");
      codeRef.current?.focus();
    } else {
      setNotice(useAuthStore.getState().loginError || "확인 코드를 보내지 못했습니다.");
    }
  };

  // 암호 재설정 메일 (입력한 이메일로)
  const handleResetPassword = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice("암호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.");
    } catch (err) {
      console.log("암호 재설정 에러:", err.code, err.message);
      setNotice("재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  // 이메일 변경 / 다른 이메일 사용: 진행 중인 인증 세션 정리 후 1단계로
  const backToEmail = async () => {
    if (pendingEmail && !user) await onLogout();
    resetSecrets();
    setStep("email");
  };

  // ---------- 닫기: 로그인 전에 있던 화면으로 ----------
  const handleClose = async () => {
    if (pendingEmail && !user) await onLogout();
    navigate(from, { replace: true });
  };

  // ================= 화면 =================
  let content = null;

  if (step === "email") {
    content = (
      <>
        <AuthHead
          title="이메일로 계속"
          desc="계정이 있는 경우 로그인하십시오. 없는 경우 새로운 계정을 생성할 수 있습니다."
        />
        <form className="auth-form" onSubmit={handleEmailSubmit} noValidate>
          <div className="auth-fields">
            <AuthField label="이메일">
              <input
                type="email"
                autoComplete="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </AuthField>
          </div>

          <div className="auth-privacy">
            <strong>Apple 계정 및 개인정보</strong>
            <p>
              Apple 계정은 안전한 로그인과 서비스 이용에 사용됩니다. 계정 정보의 처리 방식은
              Apple의 개인정보 안내에서 확인할 수 있습니다.
            </p>
            <ExternalLink href={APPLE_LINKS.privacy}>개인정보 처리 안내</ExternalLink>
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={!email.trim() || busy}>
              {busy ? "확인 중..." : "계속"}
            </button>
          </div>
          <p className="auth-hint">이메일을 입력한 뒤 계속할 수 있습니다.</p>
        </form>

        {/* 구글 계정으로 계속 */}
        <div className="auth-divider"><span>또는</span></div>
        <div className="auth-actions">
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={handleGoogleLogin}
            disabled={busy}
          >
            <svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google 계정으로 계속
          </button>
        </div>
      </>
    );
  }

  if (step === "verify") {
    const waitingCode = Boolean(pendingEmail && !user);
    content = (
      <>
        <AuthHead
          title={mode === "signup" ? "Apple 계정 생성" : "Apple 계정 확인"}
          desc={
            mode === "signup"
              ? "사용할 암호(6자 이상)를 입력하고 본인 확인을 완료하세요."
              : "계정에 설정된 인증 방법으로 본인 확인을 완료하세요."
          }
        />
        <form className="auth-form" onSubmit={handleVerifySubmit} noValidate>
          <div className="auth-fields">
            <AuthField label="Apple 계정" value={email || auth.currentUser?.email || ""} />
            {!waitingCode && (
              <AuthField label="암호">
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </AuthField>
            )}
            <AuthField label="확인 코드 · 필요한 경우">
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6자리 코드"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus={waitingCode}
              />
            </AuthField>
          </div>

          {notice && <p className="auth-notice" role="status">{notice}</p>}

          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={busy}>
              {busy ? "확인 중..." : "확인하고 계속"}
            </button>
          </div>
        </form>

        <div className="auth-links">
          <button type="button" className="auth-link" onClick={backToEmail}>
            이메일 변경
          </button>
          {waitingCode && (
            <button
              type="button"
              className="auth-link"
              onClick={handleResendCode}
              disabled={cooldown > 0 || busy}
            >
              {cooldown > 0 ? `확인 코드 다시 보내기 (${cooldown}초)` : "확인 코드 다시 보내기"}
            </button>
          )}
          {mode === "signin" && !waitingCode && (
            <button type="button" className="auth-link" onClick={handleResetPassword}>
              암호를 잊으셨습니까? <span className="ui-icon ui-icon-external" aria-hidden="true" />
            </button>
          )}
        </div>
      </>
    );
  }

  if (step === "create") {
    content = (
      <>
        <AuthHead
          title="Apple 계정 생성"
          desc="입력한 이메일로 계정을 생성한 뒤 구독 플랜을 확인하세요."
        />
        <AuthInfo
          title="새 계정으로 시작"
          lines={[
            "계정 생성과 필요한 본인 확인은 Apple 계정 화면에서 진행합니다. 완료 후 선택한 서비스의 구독 단계로 돌아옵니다.",
          ]}
        />
        <div className="auth-actions">
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              setMode("signup");
              setStep("verify");
            }}
          >
            Apple 계정 생성으로 이동 <span className="ui-icon ui-icon-external" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={() => {
              setMode("signin");
              setStep("verify");
            }}
          >
            계정 생성 후 로그인
          </button>
        </div>
        <div className="auth-links">
          <button type="button" className="auth-link" onClick={backToEmail}>
            다른 이메일 사용
          </button>
        </div>
      </>
    );
  }

  if (step === "error") {
    content = (
      <>
        <AuthHead
          title="로그인할 수 없습니다"
          desc="이메일 또는 인증 정보를 확인하고 다시 시도하세요."
        />
        <form
          className="auth-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (pendingEmail && !user) await onLogout();
            continueWithEmail(email);
          }}
        >
          <div className="auth-fields">
            <AuthField label="이메일">
              <input
                type="email"
                autoComplete="email"
                placeholder="입력한 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </AuthField>
          </div>
          <p className="auth-message" role="alert">{errorText}</p>
          <div className="auth-actions">
            <button type="submit" className="auth-btn" disabled={!email.trim() || busy}>
              다시 입력
            </button>
            <button
              type="button"
              className="auth-btn auth-btn--secondary"
              onClick={() => {
                setPassword("");
                setCode("");
                setNotice("");
                setStep("verify");
              }}
            >
              인증 다시 시도
            </button>
          </div>
        </form>
        <div className="auth-links">
          <ExternalLink href={APPLE_LINKS.recover}>Apple 계정 복구</ExternalLink>
        </div>
      </>
    );
  }

  if (step === "already") {
    content = (
      <>
        <AuthHead
          title="이미 Apple TV를 이용 중입니다"
          desc="현재 계정의 구독 혜택을 이용할 수 있습니다."
        />
        <AuthInfo
          title="이용 중인 구독"
          lines={[
            "활성 구독 또는 적용된 번들 혜택을 확인했습니다. 동일한 구독을 다시 시작할 필요가 없습니다.",
          ]}
        />
        <div className="auth-actions">
          <ExternalLink href={APPLE_LINKS.watch} className="auth-btn">
            시청하러 가기
          </ExternalLink>
          <ExternalLink href={APPLE_LINKS.manage} className="auth-btn auth-btn--secondary">
            구독 관리
          </ExternalLink>
        </div>
        <div className="auth-links">
          <button
            type="button"
            className="auth-link"
            onClick={() => navigate("/ecosystem", { replace: true })}
          >
            에코시스템 안내로 돌아가기
          </button>
        </div>
      </>
    );
  }

  // 세션 확인 전에는 빈 카드만 (로그인된 계정이 화면을 잠깐 보는 것 방지)
  if (!authReady || (user && !flowStarted.current && step !== "already")) {
    return <main className="auth-page" />;
  }

  return (
    <AuthCard onClose={handleClose} stepKey={`${step}-${mode}`}>
      {content}
    </AuthCard>
  );
};

export default Login;
