import { useSportStore } from "../../store/useSportStore";
import { useAuthStore } from "../../store/useAuthStore";
import { isLiveFootballVideo } from "./liveFootball";
import { isLive, getScore } from "./sportUtils";

// 로그인 전 히어로에 보여줄 메인 이미지 (public/images/sport/main-1.jpg)
const SPORT_MAIN_IMAGE = "/images/sport-subscribe-cta.webp";

// 스포츠 히어로
// - 로그인 전: 메인 이미지 1장만 노출
// - 로그인 후: 라이브 영상 썸네일 배경 + 하단 좌측 경기 카드
const SportHero = () => {
  const user = useAuthStore((state) => state.user);
  const { liveMatches, liveVideos } = useSportStore();

  // 실제 진행 중인 축구 경기만 사용합니다.
  const match =
    (liveMatches || []).find(isLive);
  const live = Boolean(match);
  const score = match ? getScore(match) : null;

  // 라이브 영상 (있으면 배경 썸네일 + 시청 링크)
  const video = match && (liveVideos || []).find((item) => {
    const title = item.snippet?.title?.toLowerCase() || "";
    return isLiveFootballVideo(item) &&
      [match.homeTeam?.name, match.awayTeam?.name].some((name) => name && title.includes(name.toLowerCase()));
  });
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

      {user && !match && (
        <div className="sport-hero-card"><p className="sport-empty" role="status">진행 중인 라이브가 없습니다</p></div>
      )}
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
            {match.status === "PAUSED" ? "하프타임" : match.minute ? `${match.minute > 45 ? "후반" : "전반"} ${match.minute}분 · 진행 중` : "진행 중"}
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
            <a className="sport-btn secondary" href="#sport-live">
              경기 정보
            </a>
          </div>
        </div>
      )}
    </section>
  );
};

export default SportHero;
