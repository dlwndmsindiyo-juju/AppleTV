import { useState } from "react";
import "./App.scss";
import "./mobile.scss";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Intro from "./components/common/Intro";
import Home from "./pages/Home";
import SportHome from "./pages/SportHome";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import {useAuthStore} from "./store/useAuthStore";

function App() {
  // 새로고침 시에도 세션 동안 딱 한번만 보게 하려면 sessionStorage 활용 가능
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

  // 로그인 여부 (useAuthStore 의 user 필드 기준 – 실제 필드명에 맞게 수정)
  const user = useAuthStore((state) => state.user);
  const location = useLocation(); // 페이지 전환 애니메이션용

  const handleIntroFinish = () => {
    sessionStorage.setItem("hasSeenIntro", "true");
    setShowIntro(false);
  };
  return (
    <>
      {/* 인트로가 켜져 있는 동안 화면을 덮고, 끝나면 사라짐 */}
      {showIntro ? (
        <Intro onFinish={handleIntroFinish} />
      ) : (
        <>
          {/* 로그인 여부와 상관없이 헤더 노출 (랜딩 헤더 없음) */}
          <Header />
          {/* key 가 바뀔 때마다 페이지가 부드럽게 페이드 인 */}
          <div className="page-fade" key={location.pathname}>
          <Routes>
            {/* 홈은 로그인 여부와 상관없이 기본 페이지 */}
            <Route path="/" element={<Home />} />
            <Route path="/sport" element={<SportHome />} />
            <Route path="/detail/:id" element={<Detail />} />
            {/* 로그인 페이지: 이미 로그인했다면 홈으로 */}
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login />}
            />
            {/* 허용되지 않은 경로는 홈으로 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
          <Footer />
        </>
      )}
    </>
  );
}

export default App;
