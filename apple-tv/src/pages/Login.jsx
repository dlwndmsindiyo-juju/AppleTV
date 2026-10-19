import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const Login = () => {
  const navigate = useNavigate();
  const { onGoogleLogin, onSendVerificationCode, onVerifyCode } = useAuthStore();

  // step: "login" (1단계) | "code" (2단계) | "confirm" (3단계: 인증 완료)
  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2단계 6자리 인증번호 상태 및 포커스 제어
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  // 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    const user = await onGoogleLogin();
    if (user) {
      navigate("/selectMember");
    }
  };

  // 1단계: 이메일/비밀번호 제출 시 인증번호 발송 후 2단계로 이동
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    const success = await onSendVerificationCode(email, password);
    if (success !== false) {
      setStep("code");
    }
  };

  // 6자리 입력 칸 제어 (자동 포커스 이동)
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

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

  // 2단계: 인증번호 확인 후 3단계(인증 완료)로 이동
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      alert("6자리 인증번호를 모두 입력해주세요.");
      return;
    }

    const result = await onVerifyCode(fullCode);
    
    // result가 정상적으로 반환되면 확실하게 confirm 단계로 전환
    if (result !== false) {
      setStep("confirm");
    }
  };

  // 3단계: 무료 구독 시작하기 클릭 시 멤버 선택 페이지로 이동
  const handleStartSubscribe = () => {
    navigate("/selectMember");
  };

  const handleClose = () => {
    navigate("/"); // 닫기 클릭 시 홈으로 이동
  };

  return (
    <main className="login-page">
      <div className="login-card">
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

        {/* ================= STEP 1: 로그인 입력 ================= */}
        {step === "login" && (
          <>
            <h2 className="login-title">로그인</h2>
            <p className="login-desc">Apple 계정으로 Apple TV를 이용하세요.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-field">
                <input
                  type="text"
                  placeholder="이메일 또는 전화번호"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-field">
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn">
                Apple TV 구독 플랜 보기
              </button>
            </form>

            <div style={{ marginTop: "16px", width: "100%", maxWidth: "420px" }}>
              <button
                type="button"
                className="border p-3 rounded-full bg-gray-200 font-bold w-full text-sm cursor-pointer"
                onClick={handleGoogleLogin}
              >
                구글로 간편 로그인
              </button>
            </div>

            <div className="login-links">
              <a href="#forgot" className="login-link">
                비밀번호를 잊으셨나요?
              </a>
              <a href="#signup" className="login-link">
                새 Apple 계정 만들기
              </a>
            </div>
          </>
        )}

        {/* ================= STEP 2: 6자리 인증번호 ================= */}
        {step === "code" && (
          <>
            <h2 className="login-title">인증번호를 보냈습니다.</h2>
            <p className="login-desc">
              <strong>{email || "Apple@apple.com"}</strong> 으로 6자리 인증번호를 보냈습니다.
              <br />
              메일함에서 확인 후 아래에 입력하세요.
            </p>

            <form className="login-form" onSubmit={handleVerifySubmit}>
              <div className="code-input-group">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="code-box"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button type="submit" className="login-btn">
                인증하고 계속
              </button>
            </form>

            <div className="login-links row-links">
              <button
                type="button"
                className="login-link-btn"
                onClick={() => alert("인증번호를 재전송했습니다.")}
              >
                인증번호 재전송
              </button>
              <button
                type="button"
                className="login-link-btn"
                onClick={() => setStep("login")}
              >
                다른 이메일 사용
              </button>
            </div>
          </>
        )}

        {/* ================= STEP 3: 인증 완료 (확실하게 출력) ================= */}
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
              >
                7일 무료구독 시작하기
              </button>
            </div>

            <div className="login-links row-links">
              <button
                type="button"
                className="login-link-btn"
                onClick={() => alert("고객센터로 연결합니다.")}
              >
                문제가 있나요?
              </button>
              <button
                type="button"
                className="login-link-btn"
                onClick={handleClose}
              >
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