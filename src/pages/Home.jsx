// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useMovieStore } from "../store/useMovieStore";
import HeroSection from "../components/landing/HeroSection";
import Top10Section from "../components/landing/Top10Section";
// [수정] 공개 예정 · Apple 추천: 로그인 후 메인과 같은 섹션 (시안 비구독 hi-fi)
import ComingSoon from "../components/member/ComingSoon";
import RecommendSection from "../components/member/RecommendSection";
import "../member.scss"; // 위 두 섹션 스타일
import AiAssistantPromo from "../components/ai/AiAssistantPromo"; // [이동] AI 관련 파일은 components/ai 폴더
import SubscribeCTA from "../components/landing/SubscribeCTA"; // 구독 유도 CTA (로그인 전 메인에만 표시)
import DeviceGuide from "../components/landing/DeviceGuide";
import MemberHome from "../components/member/MemberHome"; // [추가] 로그인 후 메인
import { useAuthStore } from "../store/useAuthStore"; // [추가] 로그인 상태

const Home = () => {
  // const { popMovie, onFetchPopular, tvs, onFetchTv } = useMovieStore();
  const { onFetchPopular, onFetchUpcoming } = useMovieStore();

  useEffect(() => {
    onFetchPopular();
    onFetchUpcoming(); // [추가] 공개 예정 (ComingSoon)
    // onFetchTv(); // 영화/TV 슬라이더 복구 시 함께 주석 해제
  }, [onFetchPopular, onFetchUpcoming]);

  // [추가] 로그인 사용자가 확인되면 같은 홈(/)에서 로그인 후 메인(MemberHome)을 보여줌
  const user = useAuthStore((s) => s.user);
  if (user) return <MemberHome userName={user.name} />;

  return (
    <main className="page-fade landing-home">
      {/* 1. 상단 히어로 섹션 */}
      <HeroSection />

      {/* 3. TOP 10 (호버 시 제목/평점) */}
      <Top10Section />

      {/* [수정] 비구독 전용 AI 배너: 시안 순서대로 인기 콘텐츠 바로 아래 (기존 팝업 연결 유지) */}
      <AiAssistantPromo />

      {/* 4 · 5. [수정] 공개 예정 · Apple 추천 — 로그인 후 메인 섹션 그대로 (스타일은 .member-home 감싸개 안에서 적용) */}
      <div className="member-home member-home--guest">
        <ComingSoon />
        <RecommendSection />
      </div>


      {/* 7. 구독 유도 CTA — 로그인 전에만 보임 (로그인하면 위의 MemberHome 으로 바뀌어 자동으로 숨겨짐) */}
      <SubscribeCTA type="tv" />

      {/* 8. 기기 안내 (마지막 섹션, 아래는 푸터) */}
      <DeviceGuide />

    </main>
  );
};

export default Home;
