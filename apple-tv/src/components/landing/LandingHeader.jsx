import { Link } from 'react-router-dom';

// 로그인 전(LandingHome) 전용 헤더: 로고 + 로그인 버튼만 표시
const LandingHeader = () => (
  <header>
    <div className="inner">
      <h1 className="logo">
        <Link to="/">
          <img src="/icons/header-icon.svg" alt="Apple TV" />
        </Link>
      </h1>
      <Link to="/login" className="header-login">로그인</Link>
    </div>
  </header>
);

export default LandingHeader;
