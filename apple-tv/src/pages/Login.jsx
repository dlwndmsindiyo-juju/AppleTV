import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("로그인 시도:", { email, password });
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

        {/* 타이틀 및 설명 */}
        <h2 className="login-title">로그인</h2>
        <p className="login-desc">Apple 계정으로 Apple TV를 이용하세요.</p>

        {/* 폼 영역 */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="text"
              placeholder="이메일 또는 전화번호"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-field">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-btn">
            Apple TV 구독 플랜 보기
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="login-links">
          <a href="#" className="login-link">
            비밀번호를 잊으셨나요?
          </a>
          <a href="#" className="login-link">
            새 Apple 계정 만들기
          </a>
        </div>
      </div>
    </main>
  );
};

export default Login;