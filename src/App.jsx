import { useState, useEffect } from "react";
import "./App.scss";
import "./mobile.scss";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import Search from "./pages/Search"; // 검색하기 (검색 결과)
import SearchPerson from "./pages/SearchPerson"; // 검색 > 인물
import SearchTitle from "./pages/SearchTitle"; // 검색 > 작품
import Wishlist from "./pages/Wishlist"; // 위시리스트
import WishlistLayer from "./components/wishlist/WishlistLayer"; // 위시리스트 그룹 팝업 · 토스트 (전역)
import { Profile } from "./pages/Profile"; // 계정 설정 (헤더 프로필 메뉴)

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);
  const location = useLocation();

  // 새로고침해도 로그인 유지 + authReady 를 true 로 만듦 (앱 시작 시 1회)
  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe && unsubscribe();
  }, [initAuth]);

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
          {/* 1. 헤더 */}
          <Header />

          {/* 2. 메인 컨텐츠 영역 (헤더와 푸터 사이) */}
          <div className="page-fade" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sport" element={<SportHome />} />
              <Route path="/movie/:id" element={<MovieDetail />} />
              <Route path="/tv/:id" element={<MovieDetail />} />
              <Route path="/detail/:id" element={<MovieDetail />} />
              <Route path="/sport/teams" element={<SportTeamsPage />} />
              <Route path="/sport/standings" element={<SportStandingsPage />} />
              <Route path="/sport/:type" element={<SportDetail />} />
              <Route path="/sport/match/:id" element={<SportLivePage />} />
              <Route path="/ecosystem" element={<Ecosystem />} />
              <Route path="/search" element={<Search />} />
              <Route path="/search/person/:id" element={<SearchPerson />} />
              <Route path="/search/title/:type/:id" element={<SearchTitle />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/login"
                element={isSubscribed(user) ? <Navigate to="/" replace /> : <Login />}
              />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* 3. 푸터 */}
          <Footer />

          {/* 프로모션 배너 */}
          <PromoBanner />

          {/* 위시리스트: 그룹 선택 팝업 · 새 그룹 만들기 · 추가 토스트 */}
          <WishlistLayer />
        </>
      )}
    </>
  );
}

export default App;