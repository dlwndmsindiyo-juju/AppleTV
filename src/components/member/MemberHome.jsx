// src/components/member/MemberHome.jsx
// 로그인 후 메인 페이지 (Desktop.pdf 시안)
import React, { useEffect, useRef, useState } from "react";
import { useMovieStore } from "../../store/useMovieStore";
import "../../member.scss";

// 기존 랜딩 섹션 재사용 (수정 없음)
import HeroSection from "../landing/HeroSection";
import Top10Section from "../landing/Top10Section";
// [삭제] import TrialWelcome from "../landing/TrialWelcome"; — 무료 체험 중 안내 띠 뺌
import SubscribeCTA from "../landing/SubscribeCTA"; // [추가] 홍보 배너 (시안: 공개예정작 다음) — 구독 중이면 컴포넌트가 알아서 숨김

// 신규 섹션
import ContinueWatching from "./ContinueWatching";
import WishlistSection from "./WishlistSection";
import RecommendSection from "./RecommendSection";
import MoodAssistant from "./MoodAssistant";
import { useSettings } from "../../store/useAuthStore"; // [추가] 계정 설정 "Apple Assistant 사용"
import NewRelease from "./NewRelease";
import ComingSoon from "./ComingSoon"; // 공개예정작 (시안: 신규출시와 같은 카드)
import DeviceGuide from "../landing/DeviceGuide"; // 에코시스템 (시안: 랜딩 홈의 기기 안내와 같은 회색 박스)
import { Shelf, GenreCollection } from "./PosterShelves"; // [추가] TMDB 섹션 (영화 · 시리즈 TOP 10 · 모든 영화 · 시리즈 · 다큐 · 장르별 모음 · 키즈)
import { useHeroGate, heroGateClass, HeroWaitSkeleton } from "../common/Skeleton"; // [추가] 히어로 먼저 · 로딩 뼈대

// [추가] 섹션을 3개씩 보여 줌 — 앞 묶음 끝에 가까워지면(아래 REVEAL_AHEAD 만큼 남았을 때) 다음 3개를 바로 붙임
// - [수정] "불러오는 중" 표시 · 기다리는 시간 없앰 → 끝에 닿기 전에 미리 붙여서 스크롤이 끊기지 않게
const BATCH = 3;
const REVEAL_AHEAD = "600px"; // 앞 묶음 끝이 화면 아래에서 이만큼 남았을 때 다음 묶음 (값을 키우면 더 일찍)
// 이미 펼쳐 본 섹션 수 — 상세에 갔다가 뒤로 와도 보던 섹션까지 바로 보이게 (보던 스크롤 위치로 돌아갈 수 있게)
let rememberedShown = BATCH;

const MemberHome = ({ userName = "회원" }) => {
  const settings = useSettings(); // [추가]
  const heroReady = useHeroGate(); // [추가] 히어로가 준비될 때까지 아래 섹션 대신 뼈대
  const { onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended } =
    useMovieStore();

  useEffect(() => {
    onFetchAppleOriginals();
    onFetchUpcoming();
    onFetchRecommended();
  }, [onFetchAppleOriginals, onFetchUpcoming, onFetchRecommended]);

  // [수정] 섹션 순서 (시안 · 로그인 후 OTT 메인)
  // 1 이어보기 · 2 나의 목록 · 3 인기 콘텐츠(TOP 10) · 4 Apple 추천 · 5 영화 TOP 10 · 6 모든 영화 · 7 최신작
  // 8 AI 어시스트 · 9 시리즈 TOP 10 · 10 모든 시리즈 · 11 공개 예정 · 12 다큐멘터리 · 13 모든 다큐멘터리
  // 14 장르별 모음 · 15 키즈 → (다 보이면) 홍보 배너 · 에코시스템
  const sections = [
    <ContinueWatching key="continue" />,
    <WishlistSection key="wish" />,
    <Top10Section key="top10" />,
    <RecommendSection key="recommend" />,
    <Shelf key="movie-top10" id="movie-top10" />,
    <Shelf key="all-movies" id="all-movies" />,
    <NewRelease key="new" />,
    settings.assistant ? <MoodAssistant key="ai" userName={userName} /> : null, // 계정 설정에서 Apple Assistant 를 끄면 숨김
    <Shelf key="series-top10" id="series-top10" />,
    <Shelf key="all-series" id="all-series" />,
    <ComingSoon key="soon" />,
    //  [삭제] Apple 다큐멘터리 섹션 — 다큐멘터리는 아래 한 섹션만
    <Shelf key="all-documentaries" id="all-documentaries" />,
    <GenreCollection key="genres" />,
    <Shelf key="kids" id="kids" />,
  ].filter(Boolean);

  // [추가] 3개씩 보여 주기 — 끝 표시가 화면 가까이 오면 "불러오는 중" → 다음 3개
  const [shown, setShown] = useState(() => rememberedShown);
  const sentinelRef = useRef(null);
  const allShown = shown >= sections.length;
  useEffect(() => {
    rememberedShown = shown;
  }, [shown]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || allShown || !heroReady) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setShown((n) => n + BATCH);
      },
      { rootMargin: `0px 0px ${REVEAL_AHEAD} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, allShown, heroReady]);

  return (
    <main className={`page-fade member-home${heroGateClass(heroReady)}`}>
      {/* 히어로 (기존 컴포넌트 재사용) */}
      <HeroSection />
      <HeroWaitSkeleton ready={heroReady} />

      {sections.slice(0, shown)}

      {/* 더 보여 줄 섹션이 있으면: 끝 표시(보이지 않음) */}
      {!allShown && <div ref={sentinelRef} className="member-ps-sentinel" aria-hidden="true" />}

      {/* 섹션을 모두 보여 준 뒤: 홍보 배너(구독 전 계정만) · 에코시스템 */}
      {allShown && (
        <>
          <SubscribeCTA type="tv" />
          <DeviceGuide />
        </>
      )}
    </main>
  );
};

export default MemberHome;
