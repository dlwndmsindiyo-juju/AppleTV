import { useSportStore } from "../../store/useSportStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getPresentationMatch, sportTeamLabel } from "./sportPresentation";
import { getScore } from "./sportUtils";

// 로그인 전 히어로의 기존 스포츠 이미지
const SPORT_MAIN_IMAGE = "/images/sport-subscribe-cta.webp";

// 스포츠 히어로
// - 로그인 전: 메인 이미지 1장만 노출
// - 로그인 후: PDF 히어로 이미지 + 하단 좌측 경기 카드
const SportHero = () => {
  const user = useAuthStore((state) => state.user);
  const liveMatches = useSportStore((state) => state.liveMatches);
  const match = getPresentationMatch(liveMatches);
  const score = getScore(match);

  // 로그인 후에는 제공된 PDF의 Player Profiles 이미지를 사용합니다.
  const bgImage = user ? "/images/sport/player-profiles.jpeg" : SPORT_MAIN_IMAGE;

  return (
    <section className="sport-hero">
      <div
        className="sport-hero-bg"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="sport-hero-overlay" />

      {/* 경기 카드는 로그인 후에만 */}
      {user && (
        <div className="sport-hero-card">
          <p className="sport-hero-label">
            <span className="sport-live-dot" aria-hidden="true" />
            <strong>LIVE</strong>
            <span className="sport-hero-divider">·</span>
            <span>{match.competition?.name || "프리미어리그"}</span>
          </p>

          <h2 className="sport-hero-title">
            {sportTeamLabel(match.homeTeam)}
            {score ? (
              <span className="sport-hero-score">
                {score.home} : {score.away}
              </span>
            ) : (
              <span className="sport-hero-score">vs</span>
            )}
            {sportTeamLabel(match.awayTeam)}
          </h2>

          <p className="sport-hero-sub">
            {match.status === "PAUSED" ? "하프타임" : match.minute ? `${match.minute > 45 ? "후반" : "전반"} ${match.minute}분 · 진행 중` : "진행 중"}
          </p>

          <div className="sport-hero-actions">
            <a className="sport-btn primary" href="#sport-live">▶ 경기 시청</a>
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
