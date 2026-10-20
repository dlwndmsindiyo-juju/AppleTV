import { useState } from "react";
import "./App.scss";
import "./mobile.scss";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Intro from "./components/common/Intro";
import Home from "./pages/Home";
import SportHome from "./pages/SportHome";
import { MovieDetail } from "./pages/MovieDetail";
import Login from "./pages/Login";
import { useAuthStore } from "./store/useAuthStore";

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  const user = useAuthStore((state) => state.user);
  const location = useLocation();

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
              <Route path="/detail/:id" element={<MovieDetail />} />
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* 3. 푸터 */}
          <Footer />
        </>
      )}
    </>
  );
}

export default App;