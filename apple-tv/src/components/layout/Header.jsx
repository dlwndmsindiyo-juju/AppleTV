import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 경로를 파악하기 위해 추가

  // 프로필 이니셜 (user 필드명에 맞게 수정, 없으면 "A")
  const user = useAuthStore((state) => state.user);
  const initial = (user?.name || user?.nickname || user?.email || "A")
    .charAt(0)
    .toUpperCase();

  // 현재 URL이 '/sport'로 시작하면 'sport', 아니면 'apple-tv'로 초기값 설정
  const [activeTab, setActiveTab] = useState(
    location.pathname.startsWith("/sport") ? "sport" : "apple-tv"
  );

  // 페이지가 이동(URL 변경)되었을 때 토글 버튼 상태를 동기화
  useEffect(() => {
    if (location.pathname.startsWith("/sport")) {
      setActiveTab("sport");
    } else {
      setActiveTab("apple-tv");
    }
  }, [location.pathname]);

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
            <button
              className={activeTab === "apple-tv" ? "active" : ""}
              onClick={() => handleTabChange("apple-tv")}
            >
              Apple TV
            </button>
            <button
              className={activeTab === "sport" ? "active" : ""}
              onClick={() => handleTabChange("sport")}
            >
              Sport
            </button>
          </div>

          {/* 우측 검색 및 프로필 */}
          <div className="gnb-right">
            <ul>
              <li className="search-box">
                <img src="/icons/search.svg" alt="검색 아이콘" />
                <input type="text" name="search" placeholder="작품·인물·장르" />
              </li>
              <li className="profile-box">
                <span aria-label="유저 프로필">{initial}</span>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;