
import { useState, useEffect } from "react";
import "./App.scss";
import "./mobile.scss";

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
import MemberBrowse from "./pages/MemberBrowse"; // [추가] 로그인 후 메인 "전체 보기" (/browse/:key)
import WishlistLayer from "./components/wishlist/WishlistLayer";
import { Profile } from "./pages/Profile";
import AccountSubscription from "./pages/AccountSubscription"; // [추가] 계정 설정 → 구독 관리
import AccountPayment from "./pages/AccountPayment"; // [추가] 계정 설정 → 지불 방법
import TvPreview from "./pages/TvPreview"; // [추가] TV 디자인 미리보기 (/tv)
import FloatingActions from "./components/common/FloatingActions"; // [추가] 하단 TV · TOP 버튼

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const location = useLocation();
  const isTvPreview = location.pathname === "/tv"; // [추가] TV 미리보기: 웹 헤더 · 푸터 · 배너 · 떠 있는 버튼 숨김

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
          {!isTvPreview && <Header />}

          {/* 메인 콘텐츠 */}
          <div className="page-fade" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/sport" element={<SportHome />} />

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
                  isSubscribed(user) ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Login />
                  )
                }
              />

              <Route
                path="/subscribe"
                element={<Subscribe />}
              />

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </div>

          {/* 기존 프로모션 배너 */}
          {!isTvPreview && <PromoBanner />}

          {/* 푸터 */}
          {!isTvPreview && <Footer />}

          {/* [추가] 오른쪽 아래 TV 디자인 · TOP 버튼 (항상 표시) */}
          {!isTvPreview && <FloatingActions />}

          {/* 위시리스트 팝업 및 토스트 */}
          <WishlistLayer />
        </>
      )}
    </>
  );
}

export default App;
