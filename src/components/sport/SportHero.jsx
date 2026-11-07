import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import VideoPopup from "../common/VideoPopup"; // [추가] 전체 화면 영상 팝업 공용 ("← 뒤로" · Esc · 브라우저 뒤로가기로 닫기)
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { useAuthStore } from "../../store/useAuthStore"; // [추가] 경기 시청: 로그인 전에는 구독 안내 팝업
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
import TeamBadge from "./TeamBadge"; // [추가] 팀 뱃지 (배경 없이)
import { openSubscribeGate } from "../../utils/subscribeGate"; // [정리] 구독 안내 팝업 열기 공용
import WatchPlayer from "../common/WatchPlayer"; // [수정] 경기 시청: OTT 재생과 같은 플레이어 (휴대폰도 바로 재생)
import { HeroSkeleton } from "../common/Skeleton"; // [추가] 로딩 뼈대
import { useHeroReady, preloadImage } from "../../store/useHeroReady"; // [추가] 히어로 먼저 → 아래 섹션

// [추가] 히어로 배경 이미지를 받으면 뼈대를 걷고 아래 섹션을 보여 줌
const useHeroImage = (src) => {
  const [loaded, setLoaded] = useState(false);
  const markHeroReady = useHeroReady((state) => state.markHeroReady);
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    preloadImage(src).then(() => {
      if (!alive) return;
      setLoaded(true);
      markHeroReady();
    });
    return () => {
      alive = false;
    };
  }, [src, markHeroReady]);
  return loaded;
};

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

  const heroLoaded = useHeroImage(team.banner); // [추가] 배너가 없으면 바로 준비

  const bgStyle = team.banner
    ? { backgroundImage: `url(${team.banner})`, backgroundColor: team.color }
    : { backgroundImage: `linear-gradient(135deg, ${team.color} 0%, rgba(0, 0, 0, 0.85) 100%)` };

  return (
    <section
      className="sport-hero sport-hero--team"
      style={{ "--team-color": team.color }}
      aria-label={`${team.name} 팔로우 구단`}
    >
      <HeroSkeleton className={`is-overlay${heroLoaded ? " is-done" : ""}`} />
      {/* 팀이 바뀌면 key 로 다시 그려 페이드 인 */}
      <div key={team.id} className="sport-team-hero-bg" style={bgStyle} role="img" aria-label={`${team.name} 배너`} />
      <div className="sport-team-hero-overlay" aria-hidden="true" />

      <div key={`${team.id}-body`} className="sport-team-hero-body">
        <TeamBadge className="sport-team-hero-badge" src={team.badge} fallback={team.logo} label={team.shortName} />
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
                <TeamBadge src={item.badge} fallback={item.logo} label={item.shortName} />
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
// - [수정] 경기 시청: OTT 히어로 재생처럼 누르면 바로 전체 화면 재생 (페이지 이동 없음)
//   · 영상은 라이브 상세(SportLivePage)의 첫 영상과 같음: MLS 하이라이트 클립 → 없으면 TheSportsDB 하이라이트
//   · 로그인 전에는 OTT 와 같이 구독 안내 팝업 · 왼쪽 위 "← 뒤로" · Esc · 브라우저 뒤로가기로 닫기
//   · 영상은 화면을 꽉 채움 (16:9 영상을 화면 비율에 맞춰 넘치는 부분만 잘림)
// ---------------------------------------------------------------------
const MatchHero = () => {
  const liveMatches = useSportStore((state) => state.liveMatches);
  const match = getPresentationMatch(liveMatches);
  const score = getScore(match);

  // [추가] 바로 재생할 영상 (라이브 상세 첫 영상과 같은 규칙)
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);
  const videoId = ((clips?.length > 0 ? clips : sdbVideos) || [])[0]?.id?.videoId;

  const uid = useAuthStore((state) => state.user?.uid);
  const [playing, setPlaying] = useState(false);
  const heroLoaded = useHeroImage(SPORT_HERO_SLIDES[0]); // [추가] 첫 슬라이드 이미지

  const handleWatch = () => {
    if (!uid) {
      openSubscribeGate("watch");
      return;
    }
    setPlaying(true);
  };


  return (
    <section className="sport-hero">
      <HeroSkeleton className={`is-overlay${heroLoaded ? " is-done" : ""}`} />
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
          {/* [수정] 경기 시청: 누르면 바로 재생 (OTT 히어로 ▶ 재생과 같은 방식) */}
          <button type="button" className="sport-btn primary" onClick={handleWatch}>
            <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
            경기 시청
          </button>
          <Link className="sport-btn secondary" to={`/sport/match/${match.id}`}>
            경기 정보
          </Link>
        </div>
      </div>

      {/* [추가] 전체 화면 재생 팝업 (공용 VideoPopup · 영상은 화면을 100% 채움) */}
      <VideoPopup open={playing} onClose={() => setPlaying(false)} label="경기 시청">
        {/* [수정] OTT 재생과 같은 플레이어 → 누르면 바로 재생 (휴대폰: 소리 끈 채 바로 시작 + 소리 켜기 버튼) */}
        {videoId ? (
          <WatchPlayer
            videoKey={videoId}
            title={`${sportTeamLabel(match.homeTeam)} vs ${sportTeamLabel(match.awayTeam)} 경기 시청`}
          />
        ) : (
          <p>영상을 불러오는 중입니다…</p>
        )}
      </VideoPopup>
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
