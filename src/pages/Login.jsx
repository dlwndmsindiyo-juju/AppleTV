// src/pages/Login.jsx
// 로그인 플로우 (시안)
// 1. 로그인: 한 화면에 이메일 + 비밀번호 → [Apple TV 구독 플랜 보기]
//    - 이 기기에서 로그인한 적 있으면 이메일이 미리 채워짐 ("다른 계정으로 로그인")
//    - 링크: Google 계정으로 로그인 · 비밀번호를 잊으셨나요? / 새 Apple 계정 만들기
// 2. 구글 로그인만: 처음 로그인하는 기기에서 "인증번호를 보냈습니다" (6칸 입력)
// 3. 인증 완료 (기본 로그인 · 구글 공통) → 4. 가족 프로필 선택 (아빠 · 엄마 · 아들 · 딸) — 로그인할 때마다 항상
//    → 구독 중이면 로그인 후 메인 홈(/), 아니면 플랜 선택(/subscribe)
// - 새 Apple 계정 만들기: 이메일 + 비밀번호(6자 이상) → 인증 완료 → 프로필 선택 → 플랜 선택
// - 로그인이 끝난 계정이 /login 으로 다시 들어오면 화면을 보여주지 않고 바로 이동
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // [수정] Link: 안내 페이지로 사이트 안 이동
import { sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "../firebase/firebase";
import {
  useAuthStore,
  isSubscribed,
  loadLastAccount,
  saveLastAccount,
  clearLastAccount,
} from "../store/useAuthStore";
import { MANAGE_URL, PRIVACY_URL, RECOVER_URL, TERMS_URL } from "../data/appleLinks"; // [수정] 사이트 안 안내 페이지 주소
import ProfilePicker from "../components/profile/ProfilePicker"; // [추가] 프로필 고르기 · 추가
import { SubscribePopup } from "./Subscribe"; // [추가] 구독 팝업
import { resumePath } from "../utils/resumeIntent"; // [추가] 로그인 · 구독 후 하던 화면으로 돌아가기
import { GateCard, WATCH_DESC } from "../components/layout/SubscribeGate"; // [추가] "구독 후 이용해주세요." 팝업 (스포츠 등과 같은 디자인)
// 로그인 · 구독 카드 스타일(.auth-*)은 App.scss 맨 아래에 있음

// =====================================================================
// 로그인 · 구독 공용 카드 조각 (Subscribe.jsx 에도 같은 코드가 있음 — 바꿀 때 함께 수정)
// =====================================================================
// 외부(Apple 공식) 링크 — 주소가 바뀌면 여기만 수정
const APPLE_LINKS = {
  privacy: PRIVACY_URL, // [수정] 외부 → /privacy
  recover: RECOVER_URL, // [수정] 외부 → /account-recovery
  watch: "https://tv.apple.com/kr",
  manage: MANAGE_URL, // 무료 체험 안내(TrialWelcome)와 같은 구독 관리 주소
};

// 카드 껍데기: 닫기 버튼 + 로고(public/icons/header-icon.svg) + 단계별 내용
// stepKey 가 바뀔 때마다 내용이 아래에서 살짝 올라오며 나타남
const AuthCard = ({ wide = false, className = "", onClose, stepKey, children }) => (
  <main className="auth-page page-fade">
    <div className={`auth-card${wide ? " auth-card--wide" : ""}${className ? ` ${className}` : ""}`}>
      <button type="button" className="auth-close" onClick={onClose}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        닫기
      </button>

      <div className="auth-logo">
        <img src="/icons/login-logo.svg" alt="Apple TV" />
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
const HANGUL_RE = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/; // [추가] 한글(자모 · 완성형) — 회원가입 이메일 · 비밀번호에 쓰면 막음

const CODE_LENGTH = 6;

// 6칸 인증번호 입력 (붙여넣기 · 지우기 · 방향키 지원)
const CodeInput = ({ value, onChange, onComplete, disabled }) => {
  const refs = useRef([]);
  // value: 빈 칸은 공백으로 자리를 지킴 (예: "12 4  ")
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => (/\d/.test(value[i] || "") ? value[i] : ""));
  const toValue = (list) => list.map((d) => d || " ").join("").trimEnd();

  const emit = (next) => {
    onChange(toValue(next));
    if (!next.includes("")) onComplete?.(next.join(""));
  };

  const setAt = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    emit(next);
  };

  const handleChange = (index, e) => {
    const nums = e.target.value.replace(/\D/g, "");
    if (!nums) return;
    if (nums.length > 1) {
      // 여러 자리 입력(붙여넣기 · 자동 완성): 지금 칸부터 채움
      const next = digits.slice();
      nums.split("").forEach((d, k) => {
        if (index + k < CODE_LENGTH) next[index + k] = d;
      });
      refs.current[Math.min(index + nums.length, CODE_LENGTH - 1)]?.focus();
      emit(next);
      return;
    }
    setAt(index, nums.slice(-1));
    if (index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        setAt(index, "");
      } else if (index > 0) {
        setAt(index - 1, "");
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="auth-code" role="group" aria-label="6자리 인증번호">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="auth-code-box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={CODE_LENGTH}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`${i + 1}번째 숫자`}
          autoFocus={i === 0}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

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
    onSelectProfile,
    clearLoginError,
  } = useAuthStore();

  // step: "login" | "signup" | "code" | "done" | "profile"
  const [step, setStep] = useState("select");
  const [gateOpen, setGateOpen] = useState(false); // [추가] 프로필 선택 화면 위 "구독 후 이용해주세요."
  const [subOpen, setSubOpen] = useState(false); // [추가] 그다음 구독 팝업
  // [수정] 구독 전 계정: 프로필 선택 화면이 열리면 안내 팝업 없이 구독 플랜 팝업이 바로 자동으로 뜸
  // - 뒤 배경은 로그인 · 프로필 화면 그대로 (홈 히어로 배경으로 넘어가지 않음)
  // - 닫으면 프로필 선택 화면 그대로 · 구독 완료 → 보던 화면(없으면 홈)
  const authUser = useAuthStore((s) => s.user);
  const gateAutoRef = useRef(false);
  useEffect(() => {
    if (step !== "profile") {
      gateAutoRef.current = false;
      return;
    }
    if (gateAutoRef.current || !authUser || isSubscribed(authUser)) return;
    gateAutoRef.current = true;
    setSubOpen(true);
  }, [step, authUser]);
  // [추가] 새 시안의 입력 상태
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [remembered, setRemembered] = useState(false); // 이 기기에서 로그인한 적 있는 계정 (이메일 미리 채움)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""); // 안내 문구 (회색)
  const [errorText, setErrorText] = useState(""); // 오류 문구 (빨강)
  const [cooldown, setCooldown] = useState(0); // 인증번호 재전송 대기(초)

  const enteredChecked = useRef(false); // 처음 들어왔을 때 1번만 검사
  const flowStarted = useRef(false); // 이 화면에서 로그인을 진행했는지

  // 재전송 대기 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ---------- 처음 들어왔을 때 ----------
  useEffect(() => {
    if (!authReady || enteredChecked.current) return;
    enteredChecked.current = true;
    if (user && location.state?.switchProfile) {
      // [추가] 헤더 프로필 메뉴 "프로필 전환": 로그인된 계정이면 바로 프로필 선택 화면 (고르면 보던 화면으로)
      setStep("profile");
    } else if (user) {
      // 로그인이 끝난 계정: 화면을 보여주지 않고 바로 이동
      if (isSubscribed(user)) navigate(from, { replace: true });
      else navigate("/subscribe", { replace: true, state: { from } });
    } else if (pendingEmail) {
      // 인증번호 입력 도중 새로고침: 인증번호 화면으로 복귀
      setEmail(pendingEmail);
      setStep("code");
    } else {
      // 이 기기에서 이메일 · 비밀번호로 로그인한 적 있으면 이메일 미리 채움
      const last = loadLastAccount();
      if (last?.provider === "password") {
        setEmail(last.email);
        setRemembered(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const clearMessages = () => {
    setNotice("");
    setErrorText("");
    clearLoginError();
  };

  // 구독 중이면 로그인 후 메인 홈, 아니면 플랜 선택
  // [수정] 구독 전이면 메인으로 넘기지 않고 지금 화면(프로필 선택) 위에
  //   "구독 후 이용해주세요." → [구독하기] → 구독 팝업 → 구독 완료 → 메인
  // [수정] 구독까지 끝나면 메인 대신 로그인 전에 하던 화면으로 (AI 추천 칩 등 · utils/resumeIntent.js)
  const backTo = () => resumePath() || from;
  const goNext = (u) => {
    if (isSubscribed(u)) navigate(backTo(), { replace: true });
    else setSubOpen(true); // [수정] 구독 전: 안내 팝업 대신 구독 플랜 팝업 바로
  };

  // 로그인 · 인증 완료: 이 기기에 계정 기억 → "인증 완료" 화면
  const finish = () => {
    saveLastAccount(auth.currentUser);
    setPassword("");
    setCode("");
    clearMessages();
    // 인증 완료 직후 프로필 선택 화면으로 이동 (구독 전 계정은 그 위에 구독 안내 팝업이 자동으로 뜸 · 아래 effect)
    setStep("profile");
  };

  // 인증 완료 → 로그인할 때마다 항상 가족 프로필 선택 (새 계정도 포함)
  const handleDoneContinue = () => {
    setStep("profile");
  };

  // [수정] 프로필 선택 (혼자 쓰든 가족이 쓰든 로그인할 때마다 항상)
  const handlePickProfile = (id) => {
    onSelectProfile(id);
    goNext(useAuthStore.getState().user);
  };

  // ---------- 1. 로그인 (이메일 + 비밀번호 · 확인 코드 없음) ----------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    clearMessages();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErrorText("이메일 형식을 확인해 주세요.");
      return;
    }
    if (!password) {
      setErrorText("비밀번호를 입력해 주세요.");
      return;
    }
    flowStarted.current = true;
    setBusy(true);
    // [추가] 로그인 상태 유지 선택을 Firebase 인증 지속성에 반영
    try {
      await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
    } catch {
      setBusy(false);
      setErrorText("로그인 설정을 저장하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    const res = await onEmailAuth("signin", trimmed, password);
    setBusy(false);
    if (res.status === "ok") finish();
    else setErrorText(useAuthStore.getState().loginError || "이메일 또는 비밀번호가 올바르지 않습니다.");
  };

  // ---------- 새 Apple 계정 만들기 (확인 코드 없음) ----------
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    clearMessages();
    const trimmed = email.trim();
    // [추가] 한글이 들어간 이메일 · 비밀번호로는 가입할 수 없음 (영문 · 숫자 · 기호만)
    if (HANGUL_RE.test(trimmed)) {
      setErrorText("영문 · 숫자로만 입력해 주세요.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setErrorText("이메일 형식을 확인해 주세요.");
      return;
    }
    if (HANGUL_RE.test(password)) {
      setErrorText("영문 · 숫자 · 기호로 입력해 주세요.");
      return;
    }
    if (password.length < 6) {
      setErrorText("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!termsAgreed) {
      setErrorText("필수 이용약관 및 개인정보 처리 동의가 필요합니다.");
      return;
    }
    flowStarted.current = true;
    setBusy(true);
    const res = await onEmailAuth("signup", trimmed, password);
    setBusy(false);
    if (res.status === "ok") finish();
    else setErrorText(useAuthStore.getState().loginError || "계정을 만들지 못했습니다.");
  };

  // ---------- Google 계정으로 로그인 (처음 로그인하는 기기만 인증번호) ----------
  const handleGoogleLogin = async () => {
    if (busy) return;
    flowStarted.current = true;
    clearMessages();
    setBusy(true);
    const res = await onGoogleLogin();
    setBusy(false);

    if (res.status === "ok") {
      finish();
    } else if (res.status === "needCode") {
      setEmail(useAuthStore.getState().pendingEmail || "");
      setCode("");
      setCooldown(RESEND_SECONDS);
      setStep("code");
    } else if (res.status === "error") {
      setErrorText(useAuthStore.getState().loginError || "Google 로그인에 실패했습니다.");
    } // cancel: 팝업을 닫은 경우 그대로 둠
  };

  // ---------- 2. 인증번호 확인 ----------
  const submitCode = async (value = code) => {
    if (busy) return;
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value)) {
      setErrorText("6자리 인증번호를 입력해 주세요.");
      return;
    }
    clearMessages();
    flowStarted.current = true;
    setBusy(true);
    const u = await onVerifyCode(value);
    setBusy(false);
    if (u) finish();
    else {
      setCode("");
      setErrorText(useAuthStore.getState().loginError || "인증번호가 올바르지 않습니다.");
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    submitCode();
  };

  // 인증번호 재전송
  const handleResendCode = async () => {
    if (cooldown > 0 || busy) return;
    clearMessages();
    setBusy(true);
    const ok = await onSendVerificationCode();
    setBusy(false);
    if (ok) {
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice("인증번호를 다시 보냈습니다. 메일함을 확인해 주세요.");
    } else {
      setErrorText(useAuthStore.getState().loginError || "인증번호를 보내지 못했습니다.");
    }
  };

  // 비밀번호 재설정 메일 (입력한 이메일로)
  const handleResetPassword = async () => {
    if (busy) return;
    clearMessages();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErrorText("비밀번호를 재설정할 이메일을 먼저 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setNotice("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.");
    } catch (err) {
      console.log("암호 재설정 에러:", err.code, err.message);
      setErrorText("재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  // 로그인 화면으로 (진행 중인 인증 세션은 정리)
  const backToLogin = async () => {
    if (pendingEmail && !user) await onLogout();
    setPassword("");
    setCode("");
    clearMessages();
    setStep("select");
  };

  // 다른 계정으로 로그인 / 다른 이메일 사용: 기억한 계정을 지우고 빈 로그인 화면
  const switchAccount = async () => {
    clearLastAccount();
    setRemembered(false);
    setEmail("");
    await backToLogin();
  };

  const goSignup = () => {
    setPassword("");
    clearMessages();
    if (remembered) setEmail("");
    setConfirmPassword("");
    setTermsAgreed(false);
    setStep("signup");
  };

  // ---------- 닫기: 로그인 전에 있던 화면으로 ----------
  const handleClose = async () => {
    if (pendingEmail && !user) await onLogout();
    navigate(from, { replace: true });
  };

  // 안내 · 오류 문구
  const messages = (
    <>
      {errorText && <p className="auth-login-error" role="alert">{errorText}</p>}
      {!errorText && notice && <p className="auth-login-notice" role="status">{notice}</p>}
    </>
  );

  // [추가] 이메일 로그인 / 비밀번호 재설정 화면으로 이동
  const goEmailLogin = () => { clearMessages(); setStep("login"); };
  const goReset = () => { clearMessages(); setStep("reset"); };

  // ================= 화면 =================
  let content = null;

  // [추가] 로그인 방식 선택 (시안 3)
  if (step === "select") {
    content = <>
      <AuthHead title="Apple TV에 로그인" desc="이메일 또는 Google 계정으로 로그인해 주세요." />
      <div className="auth-login-form auth-choice">
        <button type="button" className="auth-btn auth-login-btn" onClick={goEmailLogin}>이메일로 로그인</button>
        <button type="button" className="auth-btn auth-btn--secondary auth-google-btn" onClick={handleGoogleLogin} disabled={busy}>
          <img className="auth-google-mark" src="/icons/google.svg" alt="" aria-hidden="true" />{busy ? "연결 중..." : "Google로 로그인"}
        </button>
        <div className="auth-divider"><span>아직 계정이 없으신가요?</span></div>
        <button type="button" className="auth-btn auth-btn--secondary" onClick={goSignup}>회원가입</button>
        {messages}
        <p className="auth-legal"><Link to={TERMS_URL}>이용약관</Link> <span>및</span> <Link to={APPLE_LINKS.privacy}>개인정보 처리방침</Link></p>
      </div>
    </>;
  }

  // [추가] 비밀번호 재설정 화면 (시안 4)
  if (step === "reset") {
    content = <>
      <AuthHead title="비밀번호 찾기" desc="가입한 이메일로 재설정 링크를 보내드려요." />
      <form className="auth-form auth-login-form" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} noValidate>
        <input className="auth-login-input" type="email" autoComplete="email" placeholder="이메일 주소를 입력하세요" aria-label="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        {messages}
        <button type="submit" className="auth-btn auth-login-btn" disabled={busy}>{busy ? "발송 중..." : "비밀번호 재설정 메일 발송"}</button>
      </form>
      <div className="auth-login-links"><p className="auth-muted">Google로 가입하셨나요?</p><button type="button" className="auth-login-link" onClick={backToLogin}>로그인으로 돌아가기</button></div>
    </>;
  }

  // 1. 로그인 (시안: 이메일 + 비밀번호 한 화면)
  if (step === "login") {
    content = (
      <>
        <AuthHead title={errorText ? "로그인 정보를 확인해 주세요" : "이메일로 로그인"} desc={errorText ? "이메일 또는 비밀번호를 다시 확인해 주세요." : "가입한 이메일과 비밀번호를 입력해 주세요."} />
        <form className="auth-form auth-login-form" onSubmit={handleLoginSubmit} noValidate>
          <div className="auth-login-fields">
            <input
              className="auth-login-input"
              type="email"
              autoComplete="username"
              placeholder="hi1234@naver.com"
              aria-label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={!remembered}
            />
            <input
              className="auth-login-input"
              type="password"
              autoComplete="current-password"
              placeholder="123456"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus={remembered}
            />
          </div>
          <label className="auth-remember"><input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} /> 로그인 상태 유지</label>
          {messages}
          <button type="submit" className="auth-btn auth-login-btn" disabled={busy}>
            {busy ? "확인 중..." : errorText ? "다시 입력하기" : "로그인"}
          </button>
        </form>

        <div className="auth-login-links">
          <button type="button" className="auth-login-link" onClick={goReset}>비밀번호를 잊으셨나요?</button>
          <p className="auth-muted">계정이 없으신가요? <button type="button" className="auth-login-link auth-inline-link" onClick={goSignup}>회원가입</button></p>
          <div className="auth-divider"><span>또는</span></div>
          <button type="button" className="auth-btn auth-btn--secondary auth-google-btn" onClick={handleGoogleLogin} disabled={busy}><img className="auth-google-mark" src="/icons/google.svg" alt="" aria-hidden="true" />Google로 로그인</button>
          <button type="button" className="auth-login-link" onClick={() => { clearMessages(); setStep("select"); }}>다른 방법으로 로그인</button>
        </div>
      </>
    );
  }

  // 새 Apple 계정 만들기 (로그인 화면과 같은 모양)
  if (step === "signup") {
    content = (
      <>
        <AuthHead title="이메일로 회원가입" desc="로그인에 사용할 이메일과 비밀번호를 입력해 주세요." />
        <form className="auth-form auth-login-form" onSubmit={handleSignupSubmit} noValidate>
          <div className="auth-login-fields">
            <input
              className="auth-login-input"
              type="email"
              autoComplete="email"
              placeholder="이메일"
              aria-label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              className="auth-login-input"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 (6자 이상)"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input className="auth-login-input" type="password" autoComplete="new-password" placeholder="비밀번호 확인" aria-label="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <label className="auth-remember"><input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} /> [필수] 이용약관 및 개인정보 수집·이용 동의</label>
          {messages}
          <button type="submit" className="auth-btn auth-login-btn" disabled={busy}>
            {busy ? "만드는 중..." : "동의하고 회원가입"}
          </button>
        </form>
        <div className="auth-login-links">
          <button type="button" className="auth-login-link" onClick={backToLogin}>
            이미 가입하셨나요? 로그인
          </button>
        </div>
      </>
    );
  }

  // 2. 인증번호 (구글 로그인 · 처음 로그인하는 기기)
  if (step === "code") {
    const shownEmail = email || pendingEmail || auth.currentUser?.email || "";
    content = (
      <>
        <AuthHead title="인증번호를 보냈습니다." />
        <p className="auth-desc">
          {shownEmail} 으로 6자리 인증번호를 보냈습니다.
          <br />
          메일함에서 확인 후 아래에 입력하세요.
        </p>
        <form className="auth-form auth-login-form" onSubmit={handleCodeSubmit} noValidate>
          <CodeInput value={code} onChange={setCode} onComplete={submitCode} disabled={busy} />
          {messages}
          <button type="submit" className="auth-btn auth-login-btn" disabled={busy || code.replace(/\D/g, "").length < CODE_LENGTH}>
            {busy ? "확인 중..." : "인증하고 계속"}
          </button>
        </form>
        <div className="auth-login-links">
          <div className="auth-login-links-row">
            <button
              type="button"
              className="auth-login-link"
              onClick={handleResendCode}
              disabled={cooldown > 0 || busy}
            >
              {cooldown > 0 ? `인증번호 재전송 (${cooldown}초)` : "인증번호 재전송"}
            </button>
            <button type="button" className="auth-login-link" onClick={switchAccount}>
              다른 이메일 사용
            </button>
          </div>
        </div>
      </>
    );
  }

  // 3. 인증 완료 (기본 로그인 · 구글 공통)
  if (step === "done") {
    content = (
      <>
        <div className="auth-done">
          <AuthHead title="인증 완료" />
          <p className="auth-desc">
            로그인이 완료되었습니다.
            <br />
            이제 Apple TV를 이용할 수 있습니다.
          </p>
        </div>
        <div className="auth-login-form">
          <button type="button" className="auth-btn auth-login-btn" onClick={handleDoneContinue}>
            프로필 선택하기
          </button>
        </div>
        <div className="auth-login-links">
          <div className="auth-login-links-row">
            {/* [수정] 외부 새 창 → 사이트 안 계정 복구 안내 */}
            <Link to={APPLE_LINKS.recover} className="auth-login-link">
              문제가 있나요?
            </Link>
            <button type="button" className="auth-login-link" onClick={() => navigate("/", { replace: true })}>
              나중에
            </button>
          </div>
        </div>
      </>
    );
  }

  // 4. [수정] 프로필 선택 · 추가 (로그인할 때마다 · 최대 5개 · "+" 로 언제든 추가)
  if (step === "profile") {
    content = (
      <>
        <AuthHead title="누가 시청하나요?" desc="시청할 프로필을 선택하거나 새 프로필을 추가하세요." />
        <ProfilePicker className="auth-profile-picker" onPick={handlePickProfile} />
      </>
    );
  }

  // 세션 확인 전에는 빈 카드만 (로그인된 계정이 화면을 잠깐 보는 것 방지)
  if (!authReady || (user && !flowStarted.current && !["done", "profile"].includes(step))) {
    return <main className="auth-page" />;
  }

  return (
    <AuthCard className="auth-card--login" onClose={handleClose} stepKey={step}>
      {content}
      {/* [추가] 1. 구독 안내 팝업 → 2. 구독 팝업 (닫으면 프로필 선택 화면 그대로 · 구독 완료 → 홈) */}
      {gateOpen && (
        <GateCard
          title="구독해야 이용 가능한 콘텐츠입니다." // [수정] 짧은 안내
          desc={WATCH_DESC}
          button="구독하기"
          onPrimary={() => {
            setGateOpen(false);
            setSubOpen(true);
          }}
          onClose={() => setGateOpen(false)}
        />
      )}
      {subOpen && (
        <SubscribePopup onClose={() => setSubOpen(false)} onDone={() => navigate(backTo(), { replace: true })} />
      )}
    </AuthCard>
  );
};

export default Login;
