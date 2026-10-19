import React from "react";
import { useSportStore } from "../../store/useSportStore";
import { useAuthStore } from "../../store/useAuthStore";
import { isLive, formatKickoff, getScore } from "./sportUtils";

// 로그인 전 히어로에 보여줄 메인 이미지 (public/images/sport/main-1.jpg)
const SPORT_MAIN_IMAGE = "/images/sport/main-1.jpg";

// 스포츠 히어로
// - 로그인 전: 메인 이미지 1장만 노출
// - 로그인 후: 라이브 영상 썸네일 배경 + 하단 좌측 경기 카드
const SportHero = () => {
  const user = useAuthStore((state) => state.user);
  const { upcomingMatches, liveVideos } = useSportStore();

  // 진행 중인 경기가 있으면 우선, 없으면 가장 가까운 예정 경기
  const match =
    (upcomingMatches || []).find(isLive) || (upcomingMatches || [])[0];
  const live = match ? isLive(match) : false;
  const score = match ? getScore(match) : null;

  // 라이브 영상 (있으면 배경 썸네일 + 시청 링크)
  const video = (liveVideos || [])[0];
  const thumb =
    video?.snippet?.thumbnails?.high?.url ||
    video?.snippet?.thumbnails?.medium?.url;
  const watchUrl = video?.id?.videoId
    ? `https://www.youtube.com/watch?v=${video.id.videoId}`
    : null;

  // 로그인 전에는 메인 이미지, 로그인 후에는 라이브 썸네일(없으면 메인 이미지)
  const bgImage = user && thumb ? thumb : SPORT_MAIN_IMAGE;

  return (
    <section className="sport-hero">
      <div
        className="sport-hero-bg"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="sport-hero-overlay" />

      {/* 경기 카드는 로그인 후에만 */}
      {user && match && (
        <div className="sport-hero-card">
          <p className="sport-hero-label">
            {live ? (
              <>
                <span className="sport-live-dot" aria-hidden="true" />
                <strong>LIVE</strong>
              </>
            ) : (
              <strong>예정</strong>
            )}
            <span className="sport-hero-divider">·</span>
            <span>{match.competition?.name || "프리미어리그"}</span>
          </p>

          <h2 className="sport-hero-title">
            {match.homeTeam?.shortName || match.homeTeam?.name}
            {score ? (
              <span className="sport-hero-score">
                {score.home} : {score.away}
              </span>
            ) : (
              <span className="sport-hero-score">vs</span>
            )}
            {match.awayTeam?.shortName || match.awayTeam?.name}
          </h2>

          <p className="sport-hero-sub">
            {live ? "진행 중" : `${formatKickoff(match.utcDate)} 킥오프`}
          </p>

          <div className="sport-hero-actions">
            {watchUrl ? (
              <a
                className="sport-btn primary"
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
              >
                ▶ 경기 시청
              </a>
            ) : (
              <span className="sport-btn primary disabled">▶ 경기 시청</span>
            )}
            <a className="sport-btn secondary" href="#sport-upcoming">
              경기 정보
            </a>
          </div>
        </div>
      )}
    </section>
  );
};

export default SportHero;
