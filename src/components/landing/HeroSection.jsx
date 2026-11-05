import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { shortGenres } from "../member/useContentInfo";
import { loadYouTubeApi } from "../common/youtubeApi"; // [정리] YouTube API 불러오기 공용

// Swiper 기본 스타일
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// 커스텀 SCSS 불러오기
import "../../App.scss";

// [수정] 히어로 — Apple TV+ 오리지널 인기순 6개 (로그인 전 · 후 홈 공통)
// - 정보: 제목 · [연령 등급] [TV 프로그램] [장르] [장르] 칩 · 줄거리 두 줄
//   · [수정] 제목: 모든 화면에서 작품 로고 이미지 (TMDB 공식 타이틀 · 로고가 없으면 글자)
// - 버튼: ▶ 재생 (상세에서 바로 재생 ?play=1 · 로그인 전에는 구독 안내 팝업) · ♡ 찜 (위시리스트에 담기 → 그룹 고르기)
// - [수정] 배경: 슬라이드에 2초 머무르면 이미지 → 예고편 영상 재생 (마우스를 올리지 않아도) · 영상이 끝나면 다음 슬라이드
//   · 예고편이 없거나 재생이 안 되는 작품은 기존처럼 5초 뒤 다음 슬라이드
//   · 영상이 재생되는 동안에는 자동 넘김을 멈추고, 다음 슬라이드로 넘어가면 다시 켬
//   · 브라우저 정책상 자동 재생은 소리 끔(mute) 상태로만 가능
//   · YouTube 버튼(일시정지 등)이 뜨지 않게: 컨트롤 끔 + 영상 위 투명 막(.hero-video-shield) · 재생이 시작된 뒤에만 영상 보이기

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

// [추가] 작품 로고 (TMDB images · 한국어 → 영어 → 언어 없음 순) — 같은 작품은 한 번만 요청
const logoCache = new Map();
const fetchLogo = (id) => {
  if (!logoCache.has(id)) {
    logoCache.set(
      id,
      fetch(`https://api.themoviedb.org/3/tv/${id}/images?api_key=${TMDB_KEY}&include_image_language=ko,en,null`)
        .then((res) => (res.ok ? res.json() : {}))
        .then((d) => {
          const logos = d.logos || [];
          const pick =
            logos.find((l) => l.iso_639_1 === "ko") ||
            logos.find((l) => l.iso_639_1 === "en") ||
            logos[0];
          return pick ? `https://image.tmdb.org/t/p/w500${pick.file_path}` : "";
        })
        .catch(() => {
          logoCache.delete(id);
          return "";
        })
    );
  }
  return logoCache.get(id);
};

const useTitleLogo = (id) => {
  const [state, setState] = useState({ id: null, src: "" });
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    fetchLogo(id).then((src) => {
      if (alive) setState({ id, src });
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return state.id === id ? state.src : "";
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

// 찜 하트 — [수정] 비어 있으면 테두리(heart-icon.svg) · 담기면 채운 하트(active-heart.svg) · App.scss (.hero-wish-icon)
const HeartIcon = ({ filled }) => <span className={`hero-wish-icon${filled ? " is-on" : ""}`} aria-hidden="true" />;

// YouTube IFrame API 불러오기는 공용 파일 (components/common/youtubeApi.js) — 영상이 끝났는지 알기 위해 사용

// [추가] 히어로 배경 예고편 (소리 끔 · 컨트롤 없음) — 재생 시작 · 끝 · 오류를 알려줌
const HeroTrailer = ({ videoKey, title, onStart, onEnd }) => {
  const holderRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef(onStart);
  const endRef = useRef(onEnd);
  startRef.current = onStart;
  endRef.current = onEnd;

  useEffect(() => {
    let player = null;
    let alive = true;
    loadYouTubeApi()
      .then((YT) => {
        if (!alive || !holderRef.current) return;
        player = new YT.Player(holderRef.current, {
          videoId: videoKey,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                setPlaying(true);
                startRef.current?.();
              }
              if (e.data === YT.PlayerState.ENDED) endRef.current?.();
            },
            onError: () => endRef.current?.(), // 재생할 수 없는 영상 → 다음 슬라이드
          },
        });
      })
      .catch(() => endRef.current?.());

    return () => {
      alive = false;
      try {
        player?.destroy();
      } catch {
        // 이미 사라진 플레이어는 무시
      }
    };
  }, [videoKey]);

  return (
    <div className={`hero-trailer${playing ? " is-playing" : ""}`} aria-hidden="true" title={title}>
      <div ref={holderRef} />
    </div>
  );
};

// 개별 작품 슬라이드 아이템
const HERO_VIDEO_DELAY = 2000; // 슬라이드에 머문 뒤 영상이 시작되기까지 (2초)

const HeroItem = ({ tv, active, onVideoStart, onVideoEnd }) => {
  const { tvVideo, onFetchTvVideo } = useMovieStore();
  const [showVideo, setShowVideo] = useState(false);
  const rating = useKrRating(tv.id);
  const logo = useTitleLogo(tv.id);
  const { wished, toggle } = useWish("tv", tv.id);

  // [수정] 지금 보이는 슬라이드가 되면 예고편을 미리 받아 두고, 2초 머무르면 영상 재생 · 다른 슬라이드로 가면 끔
  useEffect(() => {
    if (!active || !tv?.id) {
      setShowVideo(false);
      return undefined;
    }
    onFetchTvVideo(tv.id);
    const timer = setTimeout(() => setShowVideo(true), HERO_VIDEO_DELAY);
    return () => clearTimeout(timer);
  }, [active, tv?.id, onFetchTvVideo]);

  const videoList = tvVideo?.[tv.id] || [];
  const trailer = videoList.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  const genres = shortGenres("tv", tv.genre_ids).slice(0, 2);

  return (
    <div className="hero-slide-item">
      {/* 배경 및 트레일러 */}
      <div
        className="hero-media-bg"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${tv.backdrop_path})`,
        }}
      >
        {active && showVideo && trailer && (
          <HeroTrailer videoKey={trailer.key} title={trailer.name} onStart={onVideoStart} onEnd={onVideoEnd} />
        )}
        {/* 영상 위 투명 막: 마우스가 YouTube 영상에 닿지 않아 일시정지 등 버튼이 뜨지 않음 */}
        <div className="hero-video-shield" aria-hidden="true" />
      </div>

      {/* 오버레이 그라데이션 */}
      <div className="hero-overlay" />

      {/* 작품 정보 */}
      <div className="hero-info">
        {/* 제목: 작품 로고 이미지 (로고가 없으면 글자) · 크기는 App.scss */}
        <h2 className={`hero-title${logo ? " has-logo" : ""}`}>
          {logo && <img className="hero-title-logo" src={logo} alt="" aria-hidden="true" />}
          <span className="hero-title-text">{tv.name}</span>
        </h2>

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
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  // 영상이 재생되면 자동 넘김 멈춤 · 영상이 끝나면 다음 슬라이드 (넘어가면 자동 넘김 다시 켬)
  const handleVideoStart = () => swiperRef.current?.autoplay?.stop();
  const handleVideoEnd = () => swiperRef.current?.slideNext();

  useEffect(() => {
    onFetchAppleOriginals(); // 이미 불러왔으면 다시 요청하지 않음
  }, [onFetchAppleOriginals]);

  // Apple TV+ 오리지널 인기순 상위 6개 (배경 이미지가 있는 작품만)
  const heroItems = (appleOriginals || []).filter((tv) => tv.backdrop_path).slice(0, 6);

  if (heroItems.length === 0) return null;

  return (
    <div className="hero-swiper-container movie-home-hero">
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
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex);
          swiper.autoplay?.start(); // 영상 때문에 멈췄던 자동 넘김 다시 켜기
        }}
      >
        {heroItems.map((tv, index) => (
          <SwiperSlide key={tv.id}>
            <HeroItem
              tv={tv}
              active={index === activeIndex}
              onVideoStart={handleVideoStart}
              onVideoEnd={handleVideoEnd}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default HeroSection;
