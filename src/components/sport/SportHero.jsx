import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { useTeamStore, selectHeroTeam } from "../../store/useTeamStore";
import { CONFERENCES, getTeamById } from "../../data/sportTeams";
import { getPresentationMatch, sportTeamLabel } from "./sportPresentation";
import { getScore } from "./sportUtils";
import StarIcon from "./StarIcon";
import { conferenceRows } from "./standingsUtils";

// Swiper 기본 스타일 (애플TV 홈 히어로와 동일)
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// 히어로 슬라이드 이미지 (public/images/sport/ 에 넣어 주세요)
const SPORT_HERO_SLIDES = [
  "/images/sport/sports-slide-1.webp",
  "/images/sport/sports-slide-2.webp",
  "/images/sport/sports-slide-3.webp",
  "/images/sport/sports-slide-4.webp",
  "/images/sport/sports-slide-5.webp",
  "/images/sport/sports-slide-6.webp",
];

// ---------------------------------------------------------------------
// 팔로우한 구단 히어로 (배너 + 팀 뱃지, 왼쪽 정렬)
// - 보여줄 팀: 사용자가 고른 팀 → 없으면 처음 팔로우한 팀 (useTeamStore.selectHeroTeam)
// - 뱃지 → 팀 이름 → "N승 N무 N패 · 동부 컨퍼런스 N위" (리그 순위 데이터) → 팔로우 버튼
// - 여러 팀을 팔로우하면 아래 칩으로 팀 바꾸기
// - 배너가 없는 구단은 대표색(color) 그라데이션
// ---------------------------------------------------------------------
export const TeamHero = ({ team }) => {
  const favorites = useTeamStore((state) => state.favorites);
  const setHeroTeam = useTeamStore((state) => state.setHeroTeam);
  const toggleFavorite = useTeamStore((state) => state.toggleFavorite);
  const standings = useSportStore((state) => state.standings);
  const fetchStandings = useSportStore((state) => state.onFetchStandings);
  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  const following = favorites.includes(team.id);

  // 팔로우한 순서대로 (favorites 배열이 바뀔 때만 다시 계산)
  const followed = useMemo(() => favorites.map(getTeamById).filter(Boolean), [favorites]);

  // 컨퍼런스 순위 · 전적
  const record = useMemo(() => {
    const rows = conferenceRows(standings, team.conference);
    const index = rows.findIndex(({ info }) => info?.id === team.id);
    return index < 0 ? null : { ...rows[index].row, rank: index + 1 };
  }, [standings, team]);

  const conferenceText = CONFERENCES[team.conference];
  const recordText = record
    ? `${record.won ?? 0}승 ${record.draw ?? 0}무 ${record.lost ?? 0}패 · ${conferenceText} ${record.rank}위`
    : conferenceText;

  const bgStyle = team.banner
    ? { backgroundImage: `url(${team.banner})`, backgroundColor: team.color }
    : { backgroundImage: `linear-gradient(135deg, ${team.color} 0%, rgba(0, 0, 0, 0.85) 100%)` };

  return (
    <section
      className="sport-hero sport-hero--team"
      style={{ "--team-color": team.color }}
      aria-label={`${team.name} 팔로우 구단`}
    >
      {/* 팀이 바뀌면 key 로 다시 그려 페이드 인 */}
      <div key={team.id} className="sport-team-hero-bg" style={bgStyle} role="img" aria-label={`${team.name} 배너`} />
      <div className="sport-team-hero-overlay" aria-hidden="true" />

      <div key={`${team.id}-body`} className="sport-team-hero-body">
        <img className="sport-team-hero-badge" src={team.logo} alt="" />
        <h2 className="sport-team-hero-name">{team.shortName}</h2>
        <p className="sport-team-hero-record">{recordText}</p>

        <button
          type="button"
          className={`sport-team-hero-follow${following ? " is-on" : ""}`}
          onClick={() => toggleFavorite(team.id)}
          aria-pressed={following}
          aria-label={`${team.name} ${following ? "팔로우 해제" : "팔로우"}`}
        >
          <StarIcon filled={following} size={16} />
          {following ? "팔로잉" : "팀 팔로우"}
        </button>
      </div>

      {/* 팔로우한 팀이 2개 이상이면 팀 선택 칩 */}
      {followed.length > 1 && (
        <div className="sport-team-hero-chips" role="tablist" aria-label="히어로에 보여줄 팔로우 구단">
          {followed.map((item) => {
            const active = item.id === team.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`sport-team-hero-chip${active ? " is-active" : ""}`}
                onClick={() => setHeroTeam(item.id)}
                title={item.name}
              >
                <img src={item.logo} alt="" />
                <span>{item.shortName}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------
// 기본 히어로 (팔로우한 구단이 없을 때) — 기존 그대로
// - 이미지 슬라이드(페이드 + 화살표 + 페이지네이션) 위에 경기 카드 고정
// ---------------------------------------------------------------------
const MatchHero = () => {
  const liveMatches = useSportStore((state) => state.liveMatches);
  const match = getPresentationMatch(liveMatches);
  const score = getScore(match);

  return (
    <section className="sport-hero">
      {/* hero-swiper-container: 애플TV 홈 히어로의 화살표/페이지네이션 스타일을 그대로 사용 */}
      <div className="hero-swiper-container sport-hero-swiper">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          slidesPerView={1}
          loop={true}
          navigation={true}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
        >
          {SPORT_HERO_SLIDES.map((src, index) => (
            <SwiperSlide key={src}>
              <div
                className="sport-hero-bg"
                role="img"
                aria-label={`스포츠 히어로 이미지 ${index + 1} / ${SPORT_HERO_SLIDES.length}`}
                style={{ backgroundImage: `url(${src})` }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="sport-hero-overlay" aria-hidden="true" />

      {/* 경기 카드 (슬라이드가 넘어가도 고정) */}
      <div className="sport-hero-card">
        <p className="sport-hero-label">
          <span className="sport-live-dot" aria-hidden="true" />
          <strong>LIVE</strong>
          <span className="sport-hero-divider">·</span>
          <span>{match.competition?.name || "MLS"}</span>
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
          {/* 하단 LIVE 배너와 같은 경기 → 라이브 상세 */}
          <Link className="sport-btn primary" to={`/sport/match/${match.id}`}>
            <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
            경기 시청
          </Link>
          <Link className="sport-btn secondary" to={`/sport/match/${match.id}`}>
            경기 정보
          </Link>
        </div>
      </div>
    </section>
  );
};

// 스포츠 히어로 (로그인 전 / 후 동일)
// - 팔로우한 구단이 있으면 구단 히어로, 없으면 기존 경기 히어로
const SportHero = () => {
  const heroTeam = useTeamStore(selectHeroTeam);
  return heroTeam ? <TeamHero team={heroTeam} /> : <MatchHero />;
};

export default SportHero;
