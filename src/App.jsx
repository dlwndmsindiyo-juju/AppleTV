
import { useState, useEffect } from "react";
import "./App.scss";
import "./mobile.scss";
import "./auth.scss"; // [추가] 로그인 화면에만 적용되는 스타일
import "./help.scss"; // [추가] 이용 가이드 · FAQ · 지원 (/guide · /faq · /support)

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Intro from "./components/common/Intro";

import Home from "./pages/Home";
import SportHome from "./pages/SportHome";
import SportStandingsPage from "./components/sport/SportStandingsPage";
import SportDetail from "./components/sport/SportDetail";
import SportLivePage from "./components/sport/SportLivePage";
import { MovieDetail } from "./pages/MovieDetail";

import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import { useAuthStore, isSubscribed } from "./store/useAuthStore";

import SportTeamsPage from "./pages/SportTeamsPage";
import PromoBanner from "./components/landing/PromoBanner";

import Search from "./pages/Search";
import SearchPerson from "./pages/SearchPerson";
import SearchTitle from "./pages/SearchTitle";
import Wishlist from "./pages/Wishlist";
import FavoriteTeams from "./pages/FavoriteTeams"; // [추가] 관심 구단
import MemberBrowse from "./pages/MemberBrowse"; // [추가] 로그인 후 메인 "전체 보기" (/browse/:key)
import WishlistLayer from "./components/wishlist/WishlistLayer";
import ShareSheet from "./components/common/ShareSheet"; // [추가] 공유 팝업 (utils/share.js openShare 로 열기)
import ReturnPosition from "./components/common/ReturnPosition"; // [추가] 뒤로 오면 보던 스크롤 · 포커스 그대로
import AppToast from "./components/common/AppToast"; // [추가] 공용 토스트 (utils/toast.js showToast)
import AgeGuard from "./components/common/AgeGuard"; // [추가] 미성년자: 청소년 관람불가 콘텐츠 흐림 + 안내 팝업
import { Profile } from "./pages/Profile";
import AccountSubscription from "./pages/AccountSubscription"; // [추가] 계정 설정 → 구독 관리
import AccountPayment from "./pages/AccountPayment"; // [추가] 계정 설정 → 지불 방법
import TvPreview from "./pages/TvPreview"; // [추가] TV 디자인 미리보기 (/tv)
import HelpPage from "./pages/HelpPage"; // [추가] 푸터 메뉴 페이지 (이용 가이드 · FAQ · 지원)
import FloatingActions from "./components/common/FloatingActions"; // [추가] 하단 TV · TOP 버튼

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const location = useLocation();
  const isTvPreview = location.pathname === "/tv";
  const isLoginPage = location.pathname === "/login"; // [추가] 로그인은 독립 화면 // [추가] TV 미리보기: 웹 헤더 · 푸터 · 배너 · 떠 있는 버튼 숨김

  // [추가] 구독 팝업(/subscribe): 뒤에는 보던 화면(state.from · 없으면 홈)을 그대로 그리고 그 위에 팝업
  const isSubscribePopup = location.pathname === "/subscribe";
  const subscribeFrom = location.state?.from;
  const pageLocation = isSubscribePopup
    ? {
        pathname: subscribeFrom && !["/login", "/subscribe"].includes(subscribeFrom) ? subscribeFrom : "/",
        search: "",
        hash: "",
        state: null,
        key: "subscribe-bg",
      }
    : location;

  // 로그인 상태 초기화
  useEffect(() => {
    const unsubscribe = initAuth();

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [initAuth]);

  // 인트로 종료
  const handleIntroFinish = () => {
    sessionStorage.setItem("hasSeenIntro", "true");
    setShowIntro(false);
  };

  return (
    <>
      {showIntro ? (
        <Intro onFinish={handleIntroFinish} />
      ) : (
        <>
          {/* 헤더 */}
          {!isTvPreview && !isLoginPage && <Header />}

          {/* 메인 콘텐츠 */}
          <div className="page-fade" key={pageLocation.pathname}>
            <Routes location={pageLocation}>
              <Route path="/" element={<Home />} />

              <Route path="/sport" element={<SportHome />} />

              {/* [추가] 푸터 메뉴 페이지 — 같은 틀 · 내용만 다름 (data/helpData.js) */}
              <Route path="/guide" element={<HelpPage page="guide" />} />
              <Route path="/faq" element={<HelpPage page="faq" />} />
              <Route path="/support" element={<HelpPage page="support" />} />

              {/* [추가] TV 디자인 미리보기 (/tv/:id 상세와 다른 주소) */}
              <Route path="/tv" element={<TvPreview />} />

              <Route
                path="/movie/:id"
                element={<MovieDetail />}
              />

              <Route
                path="/tv/:id"
                element={<MovieDetail />}
              />

              <Route
                path="/detail/:id"
                element={<MovieDetail />}
              />

              <Route
                path="/sport/teams"
                element={<SportTeamsPage />}
              />

              <Route
                path="/sport/standings"
                element={<SportStandingsPage />}
              />

              <Route
                path="/sport/:type"
                element={<SportDetail />}
              />

              <Route
                path="/sport/match/:id"
                element={<SportLivePage />}
              />

              <Route
                path="/search"
                element={<Search />}
              />

              <Route
                path="/search/person/:id"
                element={<SearchPerson />}
              />

              <Route
                path="/search/title/:type/:id"
                element={<SearchTitle />}
              />

              <Route
                path="/wishlist"
                element={<Wishlist />}
              />

              {/* [추가] 관심 구단 (프로필 메뉴) */}
              <Route
                path="/my-teams"
                element={<FavoriteTeams />}
              />

              <Route
                path="/browse/:key"
                element={<MemberBrowse />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/profile/subscription"
                element={<AccountSubscription />}
              />

              <Route
                path="/profile/payment"
                element={<AccountPayment />}
              />

              <Route
                path="/login"
                element={
                  // [수정] 로그인 직후 프로필 선택 단계가 라우터에서 차단되지 않도록 유지
                  <Login />
                }
              />

              {/* [수정] /subscribe 는 팝업 — 아래 {isSubscribePopup && <Subscribe />} 에서 그림 */}

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </div>

          {/* [추가] 구독 팝업 (보던 화면 위에 뜸) */}
          {isSubscribePopup && <Subscribe />}

          {/* 기존 프로모션 배너 */}
          {!isTvPreview && !isLoginPage && <PromoBanner />}

          {/* 푸터 */}
          {!isTvPreview && !isLoginPage && <Footer />}

          {/* [추가] 오른쪽 아래 TV 디자인 · TOP 버튼 (항상 표시) */}
          {!isTvPreview && !isLoginPage && <FloatingActions />}

          {/* 위시리스트 팝업 및 토스트 */}
          <WishlistLayer />
          <ShareSheet /> {/* [추가] 공유 팝업 */}
          <ReturnPosition /> {/* [추가] 뒤로 오면 보던 자리 그대로 */}
          <AppToast /> {/* [추가] 공용 토스트 */}
          <AgeGuard /> {/* [추가] 청소년 관람불가 (미성년자 계정) */}
        </>
      )}
    </>
  );
}

export default App;
