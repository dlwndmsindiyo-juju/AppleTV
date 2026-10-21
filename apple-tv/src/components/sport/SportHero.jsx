import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { getPresentationMatch, sportTeamLabel } from "./sportPresentation";
import { getScore } from "./sportUtils";

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

// 스포츠 히어로 (로그인 전 / 후 동일)
// - 이미지 슬라이드(페이드 + 화살표 + 페이지네이션) 위에 경기 카드 고정
const SportHero = () => {
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
      <div className="sport-hero-overlay" />

      {/* 경기 카드 (슬라이드가 넘어가도 고정) */}
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
    </section>
  );
};

export default SportHero;
