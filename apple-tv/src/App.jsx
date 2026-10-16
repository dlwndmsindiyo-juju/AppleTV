import { useState } from "react";
import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.scss";
import Header from "./components/layout/Header";
import { Route, Router, Routes } from "react-router-dom";
import Home from "./pages/Home";
import SportHome from "./pages/SportHome";
import Footer from "./components/layout/Footer";
import Intro from "./components/common/Intro";

function App() {
  // 새로고침 시에도 세션 동안 딱 한번만 보게 하려면 sessionStorage 활용 가능
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("hasSeenIntro");
  });

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
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sport" element={<SportHome />} />
        </Routes>
        <Footer />
      </>
      )}
    </>
  );
}

export default App;
