
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

import Ecosystem from "./pages/Ecosystem";
import Search from "./pages/Search";
import SearchPerson from "./pages/SearchPerson";
import SearchTitle from "./pages/SearchTitle";
import Wishlist from "./pages/Wishlist";
import WishlistLayer from "./components/wishlist/WishlistLayer";
import { Profile } from "./pages/Profile";

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const location = useLocation();

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
          <Header />

          {/* 메인 콘텐츠 */}
          <div className="page-fade" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/sport" element={<SportHome />} />

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
                path="/ecosystem"
                element={<Ecosystem />}
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
                path="/profile"
                element={<Profile />}
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

<<<<<<< HEAD
          {/* AI 어시스턴트 안내 배너 */}
          {!location.pathname.startsWith("/sport") && <AiAssistantPromo />}
=======
          {/* AI 어시스턴트 안내 띠(AiAssistantPromo)는 로그인 전 홈(pages/Home.jsx)에서만 표시 */}
>>>>>>> 5b96e058d09fbab4acd97a4d553eca312e56a12d

          {/* 기존 프로모션 배너 */}
          <PromoBanner />

          {/* 푸터 */}
          <Footer />

          {/* 위시리스트 팝업 및 토스트 */}
          <WishlistLayer />
        </>
      )}
    </>
  );
}

export default App;
