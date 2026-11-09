// src/components/common/InfoBadges.jsx
// [추가] 작품 정보 배지 줄 — 시안(Apple TV)의 "평점 · 4K · HDR10+ · CC · AD"
// - 상세(MovieDetail) · 홈 히어로(HeroSection) 공용 · 스타일: App.scss .info-badges
// - 평점: TMDB vote_average(10점 만점) → 5점 만점
// - [추가] 로튼 토마토 점수: OMDb API (useRottenTomatoes) — type · id 를 넘기면 표시, 점수가 없으면 숨김
// - 4K · HDR10+ · CC · AD: TMDB 에 화질 · 자막 · 화면 해설 정보가 없어서
//   Apple Original 작품에만 고정으로 표시 (apple: true)
import React from "react";
import { useRottenTomatoes } from "./useRottenTomatoes";

export const APPLE_BADGES = ["4K", "HDR10+", "CC", "AD"];

// TMDB 10점 → 5점 만점 (점수가 없으면 "")
export const toFivePoint = (voteAverage) => (voteAverage > 0 ? (voteAverage / 2).toFixed(1) : "");

const InfoBadges = ({ type, id, voteAverage, apple = false, className = "" }) => {
  const score = toFivePoint(voteAverage);
  const rt = useRottenTomatoes(type, id); // [추가] "54%" | ""
  const badges = apple ? APPLE_BADGES : [];
  if (!score && !rt && !badges.length) return null;

  return (
    <ul className={`info-badges ${className}`.trim()} aria-label="작품 정보">
      {score && (
        <li className="info-score" aria-label={`평점 5점 만점에 ${score}점`}>
          <svg className="info-score-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor" />
          </svg>
          {score}
        </li>
      )}
      {/* [추가] 로튼 토마토 평론가 점수 — 60% 이상 빨강 / 미만 초록 점 */}
      {rt && (
        <li
          className={`info-rt${parseInt(rt, 10) >= 60 ? " is-fresh" : " is-rotten"}`}
          aria-label={`로튼 토마토 평론가 점수 ${rt}`}
          title="로튼 토마토 평론가 점수"
        >
          <span className="info-rt-dot" aria-hidden="true" />
          {rt}
        </li>
      )}
      {badges.map((b) => (
        <li key={b} className="info-badge">{b}</li>
      ))}
    </ul>
  );
};

export default InfoBadges;
