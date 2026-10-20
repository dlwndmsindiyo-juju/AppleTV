import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

// TV · 스포츠 양쪽에서 함께 쓰는 페이지 (들어가도 토글이 바뀌지 않음)
const SHARED_PATHS = ["/ecosystem", "/login"];

const TAB_KEY = "headerTab";
export const loadLastTab = () => {
  try {
    return sessionStorage.getItem(TAB_KEY) === "sport" ? "sport" : "apple-tv";
  } catch {
    return "apple-tv";
  }
};
const saveLastTab = (tab) => {
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    // 저장 실패는 무시
  }
};

// 경로 → 토글 (공용 페이지는 null = 유지)
const getTabForPath = (pathname) => {
  if (SHARED_PATHS.some((p) => pathname.startsWith(p))) return null;
  return pathname.startsWith("/sport") ? "sport" : "apple-tv";
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 경로를 파악하기 위해 추가

  // 토글 상태 결정
  // - /sport… → sport, 그 외 TV 페이지 → apple-tv
  // - 공용 페이지(SHARED_PATHS) → 바로 전 토글 상태를 그대로 유지
  const [activeTab, setActiveTab] = useState(() =>
    getTabForPath(location.pathname) ?? loadLastTab(),
  );

  // 페이지가 이동(URL 변경)되었을 때 토글 버튼 상태를 동기화
  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) setActiveTab(tab); // 공용 페이지면 그대로 유지
  }, [location.pathname]);

  // 마지막 토글 상태 저장 (공용 페이지에서 새로고침해도 유지)
  useEffect(() => {
    saveLastTab(activeTab);
  }, [activeTab]);

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