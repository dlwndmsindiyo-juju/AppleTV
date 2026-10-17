// src/pages/Home.jsx 예시
import React, { useEffect } from "react";
import { useMovieStore } from "../store/useMovieStore";
import HeroSection from "../components/landing/HeroSection";
import MovieSlider from "../components/common/MovieSlider"; // 방금 만든 슬라이더

const Home = () => {
  const { popMovie, onFetchPopular, tvs, onFetchTv } = useMovieStore();

  useEffect(() => {
    onFetchPopular();
    onFetchTv();
  }, [onFetchPopular, onFetchTv]);

  return (
    <main className="page-fade">
      {/* 1. 상단 히어로 섹션 (이미 만드신 것) */}
      <HeroSection />

      {/* 2. 인기 영화 슬라이더 */}
      <MovieSlider movies={popMovie} title="지금 뜨는 영화" />

      {/* 3. 인기 TV 프로그램 슬라이더 */}
      <MovieSlider movies={tvs} title="Apple TV+ 인기 시리즈" />
    </main>
  );
};

export default Home;