import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 경로를 파악하기 위해 추가

  // 현재 URL이 '/sport'로 시작하면 'sport', 아니면 'apple-tv'로 초기값 설정
  const [activeTab, setActiveTab] = useState(
    location.pathname.startsWith("/sport") ? "sport" : "apple-tv",
  );

  // 페이지가 이동(URL 변경)되었을 때 토글 버튼 상태를 동기화
  useEffect(() => {
    if (location.pathname.startsWith("/sport")) {
      setActiveTab("sport");
    } else {
      setActiveTab("apple-tv");
    }
  }, [location.pathname]);

  // 슬라이딩 인디케이터 위치 계산용
  const toggleRefs = useRef({});
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const measure = () => {
      const el = toggleRefs.current[activeTab];
      if (!el) return;
      setIndicator((prev) => ({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: prev.ready || prev.width > 0, // 첫 측정 땐 애니메이션 없이 배치
      }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "sport") {
      navigate("/sport"); // sportHome.jsx로 이동
    } else {
      navigate("/"); // home.jsx로 이동
    }
  };

  return (
    <header>
      <div className="inner">
        <h1 className="logo">
          <Link to="/">
            <img src="/icons/header-icon.svg" alt="apple tv+ 아이콘" />
          </Link>
        </h1>

        <nav>
          {/* 중간 토글 버튼 */}
          <div className="gnb-center-toggle">
            <span
              className={`toggle-indicator ${activeTab === "sport" ? "sport" : "apple-tv"}${indicator.ready ? " animated" : ""
                }`}
              style={{ left: indicator.left, width: indicator.width }}
              aria-hidden="true"
            />
            <button
              ref={(el) => (toggleRefs.current["apple-tv"] = el)}
              className={activeTab === "apple-tv" ? "active" : ""}
              onClick={() => handleTabChange("apple-tv")}
            >
              Apple TV
            </button>
            <button
              ref={(el) => (toggleRefs.current["sport"] = el)}
              className={activeTab === "sport" ? "active" : ""}
              onClick={() => handleTabChange("sport")}
            >
              Sport
            </button>
          </div>
          {/* // Header.jsx 내 gnb-right 부분 */}
          <div className="gnb-right">
            <ul>
              <li className="search-box">
                <img src="/icons/search.svg" alt="검색 아이콘" />
                <input type="text" name="search" placeholder="작품·인물·장르" />
              </li>
              <li className="profile-box">
                <span aria-label="유저 프로필">
                  <Link to="/login">
                    <img src="/icons/profile.svg" alt="프로필 기본 이미지" />
                  </Link>
                </span>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;