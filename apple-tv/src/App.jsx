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
import { MovieDetail } from "./pages/MovieDetail";
import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import { useAuthStore, isSubscribed } from "./store/useAuthStore";
import SportTeamsPage from "./pages/SportTeamsPage";
import PromoBanner from "./components/landing/PromoBanner";
import Ecosystem from "./pages/Ecosystem";

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
              <Route path="/ecosystem" element={<Ecosystem />} />
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
        </>
      )}
    </>
  );
}

export default App;