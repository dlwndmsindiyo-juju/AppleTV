// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useMovieStore } from "../store/useMovieStore";
import HeroSection from "../components/landing/HeroSection";
import ValueProps from "../components/landing/ValueProps";
import Top10Section from "../components/landing/Top10Section";
import UpcomingSection from "../components/landing/UpcomingSection";
import AppleOriginals from "../components/landing/AppleOriginals";
import AiAssistantPromo from "../components/landing/AiAssistantPromo";
import SubscribeCTA from "../components/landing/SubscribeCTA"; // 구독 유도 CTA (로그인 전 메인에만 표시)
import DeviceGuide from "../components/landing/DeviceGuide";
import MemberHome from "../components/member/MemberHome"; // [추가] 로그인 후 메인
import { useAuthStore } from "../store/useAuthStore"; // [추가] 로그인 상태
// import MovieSlider from "../components/common/MovieSlider"; // 영화/TV 슬라이더 (임시 숨김)

const Home = () => {
  // const { popMovie, onFetchPopular, tvs, onFetchTv } = useMovieStore();
  const { onFetchPopular } = useMovieStore();

  useEffect(() => {
    onFetchPopular();
    // onFetchTv(); // 영화/TV 슬라이더 복구 시 함께 주석 해제
  }, [onFetchPopular]);

  // [추가] 로그인 사용자가 확인되면 같은 홈(/)에서 로그인 후 메인(MemberHome)을 보여줌
  const user = useAuthStore((s) => s.user);
  if (user) return <MemberHome userName={user.name} />;

  return (
    <main className="page-fade">
      {/* 1. 상단 히어로 섹션 */}
      <HeroSection />

      {/* 2. 핵심 혜택 (Apple TV 설명, 링크 없음) */}
      <ValueProps />

      {/* 3. TOP 10 (호버 시 제목/평점) */}
      <Top10Section />

      {/* 4. 공개예정작 (알림 받기) */}
      <UpcomingSection />

      {/* 5. 오리지널스 */}
      <AppleOriginals />

      {/* 비구독 전용 AI: 오리지널스 바로 아래, 기존 팝업 연결 유지 */}
      <AiAssistantPromo />


      {/* 7. 구독 유도 CTA — 로그인 전에만 보임 (로그인하면 위의 MemberHome 으로 바뀌어 자동으로 숨겨짐) */}
      <SubscribeCTA type="tv" />

      {/* 8. 기기 안내 (마지막 섹션, 아래는 푸터) */}
      <DeviceGuide />

      {/* 인기 영화 슬라이더 (임시 숨김)
      <MovieSlider movies={popMovie} title="지금 뜨는 영화" />
      */}

      {/* 인기 TV 프로그램 슬라이더 (임시 숨김)
      <MovieSlider movies={tvs} title="Apple TV+ 인기 시리즈" />
      */}
    </main>
  );
};

export default Home;
