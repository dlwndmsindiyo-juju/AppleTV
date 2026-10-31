// src/components/member/MemberHome.jsx
// 로그인 후 메인 페이지 (Desktop.pdf 시안)
import React, { useEffect } from "react";
import { useMovieStore } from "../../store/useMovieStore";
import "../../member.scss";

// 기존 랜딩 섹션 재사용 (수정 없음)
import HeroSection from "../landing/HeroSection";
import ValueProps from "../landing/ValueProps";
import Top10Section from "../landing/Top10Section";
import TrialWelcome, { useTrialIntro } from "../landing/TrialWelcome"; // 무료 체험 중 안내 (체험 중일 때만 표시)
// 구독 유도 CTA(SubscribeCTA)는 로그인 전 메인(Home.jsx)에서만 보여줌

// 신규 섹션
import ContinueWatching from "./ContinueWatching";
import WishlistSection from "./WishlistSection";
import RecommendSection from "./RecommendSection";
import MoodAssistant from "./MoodAssistant";
import NewRelease from "./NewRelease";
import ComingSoon from "./ComingSoon"; // 공개예정작 (시안: 신규출시와 같은 카드)
import DeviceGuide from "../landing/DeviceGuide"; // 에코시스템 (시안: 랜딩 홈의 기기 안내와 같은 회색 박스)

const MemberHome = ({ userName = "회원" }) => {
  const { onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended } =
    useMovieStore();

  useEffect(() => {
    onFetchAppleOriginals();
    onFetchUpcoming();
    onFetchRecommended();
  }, [onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended]);

  // 첫 구독(무료 체험) 직후: 환영 화면(문구 + TOP 10 + 홈으로 바로가기)만 보여줌
  const { showIntro, enterHome } = useTrialIntro();

  if (showIntro) {
    return (
      <main className="page-fade member-home member-home--intro">
        <TrialWelcome intro onEnterHome={enterHome} />
      </main>
    );
  }

  return (
    <main className="page-fade member-home">
      {/* 0. 무료 체험 중 안내 (하얀 배너만, 하루/일주일 안 보기 가능) */}
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

      {/* 9. 에코시스템 (아래는 기존 푸터) — 시안 내용이 기기 안내와 같아 DeviceGuide 재사용 */}
      <DeviceGuide />
    </main>
  );
};

export default MemberHome;
