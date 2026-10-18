// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useMovieStore } from "../store/useMovieStore";
import HeroSection from "../components/landing/HeroSection";
import ValueProps from "../components/landing/ValueProps";
import Top10Section from "../components/landing/Top10Section";
import UpcomingSection from "../components/landing/UpcomingSection";
import AppleOriginals from "../components/landing/AppleOriginals";
import SubscribeCTA from "../components/landing/SubscribeCTA";
import MovieSlider from "../components/common/MovieSlider";

const Home = () => {
  const { popMovie, onFetchPopular, tvs, onFetchTv } = useMovieStore();

  useEffect(() => {
    onFetchPopular();
    onFetchTv();
  }, [onFetchPopular, onFetchTv]);

  return (
    <main className="page-fade">
      {/* 1. 상단 히어로 섹션 */}
      <HeroSection />

      {/* 2. 핵심 혜택 (Apple TV 설명, 링크 없음) */}
      <ValueProps />

      {/* 3. 인기 영화 TOP 10 (호버 시 제목/평점) */}
      <Top10Section />

      {/* 4. 새로운 개봉 예정작 */}
      <UpcomingSection />

      {/* 5. Apple 오리지널 */}
      <AppleOriginals />

      {/* 6. 구독 유도 CTA */}
      <SubscribeCTA />

      {/* 7. 인기 영화 슬라이더 */}
      <MovieSlider movies={popMovie} title="지금 뜨는 영화" />

      {/* 8. 인기 TV 프로그램 슬라이더 */}
      <MovieSlider movies={tvs} title="Apple TV+ 인기 시리즈" />
    </main>
  );
};

export default Home;
