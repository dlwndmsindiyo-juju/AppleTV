import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { shortGenres } from "../member/useContentInfo";

// Swiper 기본 스타일
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// 커스텀 SCSS 불러오기
import "../../App.scss";

// [수정] 히어로 — Apple TV+ 오리지널 인기순 6개 (로그인 전 · 후 홈 공통)
// - 정보: 글자 제목 · [연령 등급] [TV 프로그램] [장르] [장르] 칩 · 줄거리 두 줄
// - 버튼: ▶ 재생 (상세에서 바로 재생 ?play=1 · 로그인 전에는 구독 안내 팝업) · ♡ 찜 (위시리스트에 담기 → 그룹 고르기)
// - 배경: 마우스를 올리면 예고편 영상 재생 (기존 그대로)

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

// 한국 관람 등급 (TMDB content_ratings · KR) — 같은 작품은 한 번만 요청
const ratingCache = new Map();
const fetchKrRating = (id) => {
  if (!ratingCache.has(id)) {
    ratingCache.set(
      id,
      fetch(`https://api.themoviedb.org/3/tv/${id}/content_ratings?api_key=${TMDB_KEY}`)
        .then((res) => (res.ok ? res.json() : {}))
        .then((d) => (d.results || []).find((r) => r.iso_3166_1 === "KR")?.rating || "")
        .catch(() => {
          ratingCache.delete(id);
          return "";
        })
    );
  }
  return ratingCache.get(id);
};

// "15" → "15+", "All" → "전체" (없으면 빈 값 → 칩 숨김)
const ratingLabel = (rating = "") => {
  const r = String(rating).trim();
  if (!r) return "";
  if (/^all$/i.test(r) || r === "0") return "전체";
  return /^\d+$/.test(r) ? `${r}+` : r;
};

const useKrRating = (id) => {
  const [state, setState] = useState({ id: null, value: "" });
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    fetchKrRating(id).then((value) => {
      if (alive) setState({ id, value });
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return state.id === id ? ratingLabel(state.value) : "";
};

// 찜 하트 (비어 있으면 테두리 · 담기면 채움)
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path
      d="M12 20.3l-1.3-1.2C6 14.9 3 12.2 3 8.9 3 6.2 5.1 4.2 7.7 4.2c1.6 0 3.1.7 4.3 1.9 1.2-1.2 2.7-1.9 4.3-1.9 2.6 0 4.7 2 4.7 4.7 0 3.3-3 6-7.7 10.2L12 20.3z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

// 개별 작품 슬라이드 아이템
const HeroItem = ({ tv, isSwiping }) => {
  const { tvVideo, onFetchTvVideo } = useMovieStore();
  const [hover, setHover] = useState(false);
  const rating = useKrRating(tv.id);
  const { wished, toggle } = useWish("tv", tv.id);

  // 마우스 오버 시 비디오 요청
  useEffect(() => {
    if (hover && tv?.id) {
      onFetchTvVideo(tv.id);
    }
  }, [hover, tv?.id, onFetchTvVideo]);

  // 슬라이드가 넘어갈 때 hover 해제
  useEffect(() => {
    if (isSwiping) setHover(false);
  }, [isSwiping]);

  const videoList = tvVideo?.[tv.id] || [];
  const trailer = videoList.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  const genres = shortGenres("tv", tv.genre_ids).slice(0, 2);

  return (
    <div
      className="hero-slide-item"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 배경 및 트레일러 */}
      <div
        className="hero-media-bg"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${tv.backdrop_path})`,
        }}
      >
        {hover && trailer && (
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailer.key}`}
            title={trailer.name}
            allow="autoplay"
          />
        )}
      </div>

      {/* 오버레이 그라데이션 */}
      <div className="hero-overlay" />

      {/* 작품 정보 */}
      <div className="hero-info">
        <h2 className="hero-title">{tv.name}</h2>

        {/* [연령 등급] [TV 프로그램] [장르] [장르] — 등급 정보가 없으면 등급 칩만 숨김 */}
        <ul className="hero-chips" aria-label="작품 정보">
          {rating && <li className="hero-chip hero-chip--rating">{rating}</li>}
          <li className="hero-chip">TV 프로그램</li>
          {genres.map((g) => (
            <li key={g} className="hero-chip">{g}</li>
          ))}
        </ul>

        {tv.overview && <p className="hero-overview">{tv.overview}</p>}

        {/* 재생 · 찜 */}
        <div className="hero-actions">
          <Link
            to={`/tv/${tv.id}?play=1`}
            className="hero-play"
            data-gate="watch" // 로그인 전: 구독 안내 팝업 (SubscribeGate)
            aria-label={`${tv.name} 재생`}
          >
            <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
            재생
          </Link>
          <button
            type="button"
            className={`hero-wish${wished ? " is-on" : ""}`}
            aria-pressed={wished}
            aria-label={wished ? `${tv.name} 찜 해제` : `${tv.name} 찜하기`}
            onClick={() =>
              toggle({
                title: tv.name,
                poster_path: tv.poster_path,
                backdrop_path: tv.backdrop_path,
                overview: tv.overview,
              })
            }
          >
            <HeartIcon filled={wished} />
          </button>
        </div>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const { appleOriginals, onFetchAppleOriginals } = useMovieStore();
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    onFetchAppleOriginals(); // 이미 불러왔으면 다시 요청하지 않음
  }, [onFetchAppleOriginals]);

  // Apple TV+ 오리지널 인기순 상위 6개 (배경 이미지가 있는 작품만)
  const heroItems = (appleOriginals || []).filter((tv) => tv.backdrop_path).slice(0, 6);

  if (heroItems.length === 0) return null;

  return (
    <div className="hero-swiper-container">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={true}
        navigation={true}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        onSlideChangeTransitionStart={() => setIsSwiping(true)}
        onSlideChangeTransitionEnd={() => setIsSwiping(false)}
      >
        {heroItems.map((tv) => (
          <SwiperSlide key={tv.id}>
            <HeroItem tv={tv} isSwiping={isSwiping} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default HeroSection;
