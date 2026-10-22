// src/components/member/MemberHome.jsx
// 로그인 후 메인 페이지 (Desktop.pdf 시안)
import React, { useEffect } from "react";
import { useMovieStore } from "../../store/useMovieStore";
import "../../member.scss";

// 기존 랜딩 섹션 재사용 (수정 없음)
import HeroSection from "../landing/HeroSection";
import ValueProps from "../landing/ValueProps";
import Top10Section from "../landing/Top10Section";
import TrialWelcome from "../landing/TrialWelcome"; // 무료 체험 중 안내 (체험 중일 때만 표시)
import SubscribeCTA from "../landing/SubscribeCTA"; // 미구독/체험 만료 시 구독 유도 (구독 중이면 숨김)

// 신규 섹션
import ContinueWatching from "./ContinueWatching";
import WishlistSection from "./WishlistSection";
import RecommendSection from "./RecommendSection";
import MoodAssistant from "./MoodAssistant";
import NewRelease from "./NewRelease";
import ComingSoon from "./ComingSoon";
import EcosystemBand from "./EcosystemBand";

const MemberHome = ({ userName = "회원" }) => {
  const { onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended } =
    useMovieStore();

  useEffect(() => {
    onFetchAppleOriginals();
    onFetchUpcoming();
    onFetchRecommended();
  }, [onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended]);

  return (
    <main className="page-fade member-home">
      {/* 0. 무료 체험 중 안내 */}
      <TrialWelcome />

      {/* 1. 히어로 + 핵심 혜택 (기존 컴포넌트 재사용) */}
      <HeroSection />
      <ValueProps />

      {/* 2. 이어보기 */}
      <ContinueWatching />

      {/* 3. 내가 찜한 콘텐츠 */}
      <WishlistSection />

      {/* 4. 인기 TOP 10 (기존 컴포넌트 재사용) */}
      <Top10Section />

      {/* 5. 추천작 */}
      <RecommendSection />

      {/* 6. AI 어시스턴트 (기분별 추천) */}
      <MoodAssistant userName={userName} />

      {/* 7. 신규 출시 */}
      <NewRelease />

      {/* 8. 공개예정작 */}
      <ComingSoon />

      {/* 8-1. 구독 유도 CTA (미구독자에게만 보임) */}
      <SubscribeCTA type="tv" />

      {/* 9. 에코시스템 (아래는 기존 푸터) */}
      <EcosystemBand />
    </main>
  );
};

export default MemberHome;
