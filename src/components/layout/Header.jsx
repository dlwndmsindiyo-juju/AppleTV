import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import SubscribeGate from "./SubscribeGate"; // 로그인 전 안내 팝업 (재생: 구독 / 찜 등: 로그인)
import { WishIcon } from "../wishlist/WishlistLayer"; // 위시리스트 하트 아이콘
import ProfileAvatar from "../profile/ProfileAvatar"; // 계정 설정에서 고른 프로필 아이콘

// TV · 스포츠 양쪽에서 함께 쓰는 페이지 (들어가도 토글이 바뀌지 않음)
const SHARED_PATHS = ["/ecosystem", "/login", "/search", "/profile"]; // 검색 · 계정 설정: 들어가기 전 토글(Apple TV / Sport) 유지

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
  // 로그인 여부: 로그인 전 → "로그인" 버튼 / 로그인 후 → 프로필 아이콘
  const user = useAuthStore((state) => state.user);
  const onLogout = useAuthStore((state) => state.onLogout);

  // 프로필 메뉴 (계정 설정 / 로그아웃)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 바깥 클릭 · Esc 로 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // 페이지가 바뀌면 메뉴 닫기
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await onLogout();
    navigate("/", { replace: true }); // 로그인 전 메인으로
  };

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

  // ---------- 검색 ----------
  // PC · 태블릿 검색창 = 검색 페이지의 검색창 (시안: 검색 페이지에는 따로 검색창이 없음)
  // - 다른 페이지: 검색창을 누르면 검색 페이지(둘러보기)로 이동 · Enter 로 바로 검색
  // - 검색 페이지: 입력을 멈추면(0.4초) 결과가 바뀌고, 주소의 검색어와 항상 같게 유지
  // - 로그인 전에도 검색 가능 (작품 재생만 구독 팝업)
  const [headerQuery, setHeaderQuery] = useState("");
  const onSearchPage = location.pathname === "/search";
  const urlQuery = onSearchPage ? new URLSearchParams(location.search).get("q") || "" : "";

  // 주소의 검색어 → 검색창 (뒤로 가기 · 검색어 지우기) / 검색 페이지를 나가면 비움
  useEffect(() => {
    setHeaderQuery((prev) => (prev.trim() === urlQuery ? prev : urlQuery));
  }, [urlQuery, onSearchPage]);

  // 검색 페이지에서 입력을 멈추면 검색어 반영
  useEffect(() => {
    if (!onSearchPage || headerQuery.trim() === urlQuery) return undefined;
    const t = setTimeout(() => {
      const q = headerQuery.trim();
      navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { replace: true });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerQuery, onSearchPage]);

  const handleHeaderFocus = () => {
    if (!onSearchPage) navigate("/search");
  };

  const handleHeaderSearch = (e) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 무시
    const q = headerQuery.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { replace: onSearchPage });
    e.currentTarget.blur();
  };

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
                {/* Enter → 검색 결과(/search?q=) · 로그인 전에는 구독 팝업 */}
                <input
                  type="text"
                  name="search"
                  placeholder="작품·인물·장르"
                  value={headerQuery}
                  onChange={(e) => setHeaderQuery(e.target.value)}
                  onKeyDown={handleHeaderSearch}
                  onFocus={handleHeaderFocus}
                  enterKeyHint="search"
                  aria-label="작품 · 인물 · 장르 검색"
                />
              </li>
              {/* 모바일 전용: 검색창 대신 검색 아이콘만 (누르면 검색 페이지로) */}
              <li className="search-icon-item">
                <Link to="/search" className="search-icon-btn" aria-label="검색">
                  <img src="/icons/search.svg" alt="" aria-hidden="true" />
                </Link>
              </li>
              {user ? (
                <li className="profile-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className="profile-box"
                    aria-label="프로필 메뉴"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    {/* 계정 설정에서 고른 기본 아이콘 (안 골랐으면 기존 profile.svg) */}
                    <ProfileAvatar avatar={user.avatar} size="sm" />
                  </button>

                  {menuOpen && (
                    <div className="profile-menu" role="menu">
                      <Link to="/wishlist" className="profile-menu-item" role="menuitem">
                        위시리스트
                        <WishIcon name="heart" className="profile-menu-icon" />
                      </Link>
                      <Link to="/profile" className="profile-menu-item" role="menuitem">
                        계정 설정
                        <img
                          className="profile-menu-icon"
                          src="/icons/setting-icon.svg"
                          alt=""
                          aria-hidden="true"
                        />
                      </Link>
                      <button
                        type="button"
                        className="profile-menu-item"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </li>
              ) : (
                <li className="login-box">
                  <Link to="/login" state={{ from: location.pathname }} className="header-login-btn">
                    <img src="/icons/User.svg" alt="" aria-hidden="true" />
                    로그인
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </div>

      {/* 로그인 전 TV 홈 · 스포츠: 본문 링크 · 버튼을 누르면 구독 유도 팝업 */}
      <SubscribeGate />
    </header>
  );
};

export default Header;
