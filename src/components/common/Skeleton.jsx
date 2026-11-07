import React, { useEffect, useLayoutEffect } from "react";
import { useHeroReady } from "../../store/useHeroReady";

// [추가] 로딩 뼈대(스켈레톤) — 내용이 오기 전에 화면 형태를 먼저 보여 줌 (스타일: App.scss .skeleton-*)
// - HeroSkeleton: 히어로 자리 (배경 + 제목 · 칩 · 소개 · 버튼 자리)
// - SectionSkeleton: 섹션 자리 (제목 + 카드 줄)
// - useHeroGate + HeroWaitSkeleton: 히어로가 준비될 때까지 아래 섹션 대신 뼈대를 보여 줌
//   · 페이지(main)에 hero-waiting 클래스 → 히어로 말고 나머지 섹션은 보이지 않게 미리 그려 둠 (App.scss)
//     (섹션을 다른 상자로 감싸지 않음: main > section 으로 잡힌 기존 스타일이 그대로 유지되게)
//   · 히어로가 끝내 준비되지 않아도(오류 등) WAIT_LIMIT 뒤에는 보여 줌

const WAIT_LIMIT = 6000; // 6초

export const HeroSkeleton = ({ className = "" }) => (
  <div className={`skeleton-hero ${className}`} aria-hidden="true">
    <div className="skeleton-hero-body">
      <span className="skeleton-block skeleton-hero-title" />
      <span className="skeleton-hero-chips">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </span>
      <span className="skeleton-block skeleton-hero-line" />
      <span className="skeleton-block skeleton-hero-line is-short" />
      <span className="skeleton-hero-actions">
        <span className="skeleton-block skeleton-hero-btn" />
        <span className="skeleton-block skeleton-hero-round" />
      </span>
    </div>
  </div>
);

// shape: "landscape"(16:9) · "poster"(2:3)
export const SectionSkeleton = ({ count = 4, shape = "landscape" }) => (
  <div className="skeleton-section" aria-hidden="true">
    <div className="inner">
      <span className="skeleton-block skeleton-section-title" />
      <div className={`skeleton-row is-${shape}`}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="skeleton-block skeleton-card" />
        ))}
      </div>
    </div>
  </div>
);

// 페이지에서 사용: const heroReady = useHeroGate(); → <main className={heroGateClass(heroReady)}>
export const useHeroGate = () => {
  const ready = useHeroReady((st) => st.ready);
  const markHeroReady = useHeroReady((st) => st.markHeroReady);
  const resetHero = useHeroReady((st) => st.resetHero);

  // 페이지를 열 때마다 다시 기다림 (그리기 전에 처리 → 아래 섹션이 잠깐 보였다 숨는 일 없음)
  useLayoutEffect(() => {
    resetHero();
  }, [resetHero]);

  // 안전장치: 히어로가 준비되지 않아도 일정 시간 뒤 보여 줌
  useEffect(() => {
    const timer = setTimeout(markHeroReady, WAIT_LIMIT);
    return () => clearTimeout(timer);
  }, [markHeroReady]);

  return ready;
};

export const heroGateClass = (ready) => (ready ? " hero-revealed" : " hero-waiting");

// 히어로 바로 아래에 두는 섹션 뼈대 (준비되면 사라짐)
export const HeroWaitSkeleton = ({ ready, skeletons = [{ shape: "landscape" }, { shape: "poster", count: 6 }] }) =>
  ready ? null : (
    <div className="skeleton-after-hero" role="status" aria-label="콘텐츠를 불러오는 중">
      {skeletons.map((sk, i) => <SectionSkeleton key={i} {...sk} />)}
    </div>
  );
