import { useState } from "react";
import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.scss";
import Header from "./components/layout/Header";
import { Route, Router, Routes } from "react-router-dom";
import { Footer } from "./components/layout/Footer";
import Home from "./pages/Home";
import SportHome from "./pages/SportHome";

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sport" element={<SportHome />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
