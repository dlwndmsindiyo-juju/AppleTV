import React, { useEffect, useRef, useState } from "react";
import { usePlayableIds } from "../../utils/youtubePlayable"; // [추가] 연령 제한 · 퍼가기 금지 예고편 빼기
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade, A11y } from "swiper/modules"; // [수정] A11y: 키보드(Tab)로 화면 밖 카드를 고르면 그 카드가 보이게 밀어 줌
import { useMovieStore } from "../../store/useMovieStore";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { shortGenres } from "../member/useContentInfo";
import { loadYouTubeApi } from "../common/youtubeApi"; // [정리] YouTube API 불러오기 공용
import InfoBadges from "../common/InfoBadges"; // [추가] 평점 · 4K · HDR10+ · CC · AD 배지 줄 (상세와 공용)
import { HeroSkeleton } from "../common/Skeleton"; // [추가] 로딩 뼈대 (화면 형태 먼저)
import { useHeroReady, preloadImage } from "../../store/useHeroReady"; // [추가] 히어로 먼저 → 아래 섹션

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
// - [수정] 정해진 시간 안에 재생이 시작되지 않으면(기기가 자동 재생을 막음 등) 다음 슬라이드로 → 이미지에서 멈춰 있지 않게
// - [수정] 휴대폰에서 누르지 않아도 재생되도록
//   · iframe 을 처음부터 직접 만듦: 자동 재생 허용(allow="autoplay") · 소리 끔 · 화면 안 재생(playsinline)이
//     처음 열릴 때부터 들어감 (예전: YouTube 가 만든 뒤에 allow 를 바꿔서 적용되지 않았음)
//   · iframe 은 YouTube API 를 기다리지 않고 바로 열기 시작 → 휴대폰에서 재생 시작이 빨라짐
//   · 재생 요청이 묻히면(시작 전 · 대기 · 멈춤 상태) 잠시 뒤 다시 요청 (최대 6번)
//   · 다른 앱에 갔다 돌아오면(화면이 다시 보이면) 다시 재생
//   · [추가] 화면 아무 곳이나 터치하거나 스크롤을 놓으면(touchend) 다시 재생 요청 (히어로를 누르지 않아도 됨)
//   · 저전력 모드 · 일부 앱 안 브라우저처럼 기기가 자동 재생을 아예 막으면 어떤 사이트도 재생할 수 없음
//     → 한 번 막힌 걸 알면 다음 슬라이드부터는 10초가 아니라 3초만 기다리고 넘어감 (재생되면 다시 10초)
const HERO_VIDEO_TIMEOUT = 10000; // 10초
const HERO_VIDEO_TIMEOUT_BLOCKED = 3000; // 자동 재생이 막힌 걸 안 뒤
const HERO_KICK_DELAY = 700;
const HERO_KICK_MAX = 6;
let heroAutoplayBlocked = false;

const trailerSrc = (videoKey) => {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    enablejsapi: "1",
    origin: window.location.origin, // 휴대폰 브라우저에서 재생 신호(postMessage)가 막히지 않게
  });
  return `https://www.youtube.com/embed/${videoKey}?${params}`;
};

const HeroTrailer = ({ videoKey, title, onStart, onEnd }) => {
  const holderRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef(onStart);
  const endRef = useRef(onEnd);
  startRef.current = onStart;
  endRef.current = onEnd;

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return undefined;
    let player = null;
    let alive = true;
    let started = false;
    let ended = false;
    let kicks = 0;
    let kickTimer = null;

    const finish = () => {
      if (ended || !alive) return;
      ended = true;
      endRef.current?.();
    };

    // iframe 을 바로 만들어 열기 시작 (자동 재생 허용 · 소리 끔 · 화면 안 재생)
    const frame = document.createElement("iframe");
    frame.src = trailerSrc(videoKey);
    frame.title = title || "예고편";
    frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
    frame.setAttribute("playsinline", "");
    frame.setAttribute("webkit-playsinline", "");
    frame.setAttribute("frameborder", "0");
    frame.setAttribute("tabindex", "-1");
    holder.appendChild(frame);

    // 재생 요청 (묻히면 잠시 뒤 다시)
    const kick = () => {
      clearTimeout(kickTimer);
      if (!alive || started || !player?.playVideo) return;
      try {
        player.mute();
        player.playVideo();
      } catch {
        // 아직 준비 전이면 무시
      }
      if (kicks < HERO_KICK_MAX) {
        kicks += 1;
        kickTimer = setTimeout(kick, HERO_KICK_DELAY);
      }
    };

    const timeout = setTimeout(() => {
      if (alive && !started) {
        heroAutoplayBlocked = true; // 기기가 자동 재생을 막는 것으로 봄 → 다음부터 짧게 기다림
        finish();
      }
    }, heroAutoplayBlocked ? HERO_VIDEO_TIMEOUT_BLOCKED : HERO_VIDEO_TIMEOUT);

    // 다른 앱에 갔다 돌아오면 다시 재생
    const onVisible = () => {
      if (document.visibilityState === "visible" && !started) {
        kicks = 0;
        kick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    // [추가] 페이지 어디든 터치 → 다시 재생 요청
    const onTouch = () => {
      if (!started) {
        kicks = 0;
        kick();
      }
    };
    document.addEventListener("touchend", onTouch, { passive: true });

    loadYouTubeApi()
      .then((YT) => {
        if (!alive) return;
        player = new YT.Player(frame, {
          events: {
            onReady: kick,
            onStateChange: (e) => {
              const S = YT.PlayerState;
              if (e.data === S.PLAYING) {
                started = true;
                heroAutoplayBlocked = false;
                clearTimeout(kickTimer);
                setPlaying(true);
                startRef.current?.();
              } else if (e.data === S.ENDED) {
                finish();
              } else if (!started && (e.data === S.UNSTARTED || e.data === S.CUED || e.data === S.PAUSED)) {
                // 시작 전 · 대기 · 멈춤에 머물면 다시 요청
                clearTimeout(kickTimer);
                kickTimer = setTimeout(kick, HERO_KICK_DELAY);
              }
            },
            onError: finish, // 재생할 수 없는 영상 → 다음 슬라이드
          },
        });
      })
      .catch(finish);

    return () => {
      alive = false;
      clearTimeout(timeout);
      clearTimeout(kickTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("touchend", onTouch);
      try {
        player?.destroy();
      } catch {
        // 이미 사라진 플레이어는 무시
      }
      frame.remove();
    };
  }, [videoKey, title]);

  return (
    <div className={`hero-trailer${playing ? " is-playing" : ""}`} aria-hidden="true" title={title}>
      <div ref={holderRef} />
    </div>
  );
};

// 개별 작품 슬라이드 아이템
// [수정] 슬라이드에 머문 뒤 영상을 띄우기까지: PC · 태블릿 2초 / 휴대폰 1초
const HERO_VIDEO_DELAY = 2000;
const HERO_VIDEO_DELAY_MOBILE = 1000;
const PHONE_QUERY = "(max-width: 767px)"; // _variables.scss $breakpoint-mobile
const heroVideoDelay = () =>
  typeof window !== "undefined" && window.matchMedia?.(PHONE_QUERY).matches ? HERO_VIDEO_DELAY_MOBILE : HERO_VIDEO_DELAY;

const HeroItem = ({ tv, active, onVideoLoad, onVideoStart, onVideoEnd }) => {
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
    const timer = setTimeout(() => setShowVideo(true), heroVideoDelay());
    return () => clearTimeout(timer);
  }, [active, tv?.id, onFetchTvVideo]);

  const videoList = tvVideo?.[tv.id] || [];
  // [수정] 연령 제한 · 퍼가기 금지 예고편은 건너뜀 (없으면 이미지 슬라이드 그대로)
  const playableKeys = usePlayableIds(videoList.filter((v) => v.site === "YouTube").map((v) => v.key));
  const trailer = videoList.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser") && playableKeys.has(v.key)
  );

  const genres = shortGenres("tv", tv.genre_ids).slice(0, 2);

  // [수정] 예고편을 띄우기 시작하면 자동 넘김을 멈춤
  // - 예전: 재생이 "시작된 뒤"에야 멈춤 → 휴대폰은 영상 준비가 느려 5초 자동 넘김이 먼저 와서 영상이 매번 끊기고 이미지만 보였음
  // - 재생이 안 되면 HeroTrailer 의 10초 제한으로 다음 슬라이드
  const videoReady = active && showVideo && Boolean(trailer);
  const loadRef = useRef(onVideoLoad);
  loadRef.current = onVideoLoad;
  useEffect(() => {
    if (videoReady) loadRef.current?.();
  }, [videoReady]);

  return (
    <div className="hero-slide-item">
      {/* 배경 및 트레일러 */}
      <div
        className="hero-media-bg"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${tv.backdrop_path})`,
        }}
      >
        {videoReady && (
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

        {/* [추가] 평점(5점 만점) + 화질 · 자막 배지 — 상세 페이지와 같은 줄 (히어로는 모두 Apple TV+ 오리지널) */}
        <InfoBadges type="tv" id={tv.id} voteAverage={tv.vote_average} apple className="hero-info-badges" />

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
  const handleVideoLoad = () => swiperRef.current?.autoplay?.stop(); // [추가] 예고편을 불러오기 시작할 때 멈춤
  const handleVideoStart = () => swiperRef.current?.autoplay?.stop();
  const handleVideoEnd = () => swiperRef.current?.slideNext();

  useEffect(() => {
    onFetchAppleOriginals(); // 이미 불러왔으면 다시 요청하지 않음
  }, [onFetchAppleOriginals]);

  // [추가] YouTube API 를 미리 불러 둠 → 첫 예고편이 늦게 뜨지 않게 (실패해도 HeroTrailer 에서 다시 시도)
  useEffect(() => {
    loadYouTubeApi().catch(() => {});
  }, []);

  // Apple TV+ 오리지널 인기순 상위 6개 (배경 이미지가 있는 작품만)
  const heroItems = (appleOriginals || []).filter((tv) => tv.backdrop_path).slice(0, 6);

  // [추가] 첫 슬라이드 배경 이미지를 다 받으면 뼈대를 걷고 → 아래 섹션도 이때부터 보여 줌 (AfterHero)
  const firstBackdrop = heroItems[0]?.backdrop_path;
  const [imageReady, setImageReady] = useState(false);
  const markHeroReady = useHeroReady((s) => s.markHeroReady);
  useEffect(() => {
    if (!firstBackdrop) return undefined;
    let alive = true;
    preloadImage(`https://image.tmdb.org/t/p/original${firstBackdrop}`).then(() => {
      if (!alive) return;
      setImageReady(true);
      markHeroReady();
    });
    return () => {
      alive = false;
    };
  }, [firstBackdrop, markHeroReady]);

  // [수정] 작품을 받기 전: 빈 화면 대신 히어로 뼈대
  if (heroItems.length === 0) {
    return (
      <div className="hero-swiper-container movie-home-hero is-loading">
        <HeroSkeleton />
      </div>
    );
  }

  return (
    <div className={`hero-swiper-container movie-home-hero${imageReady ? "" : " is-loading"}`}>
      {/* [추가] 배경 이미지를 받는 동안 뼈대를 위에 덮어 둠 → 받으면 서서히 사라짐 */}
      <HeroSkeleton className={`is-overlay${imageReady ? " is-done" : ""}`} />
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade, A11y]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={true}
        navigation={false} // [수정] 히어로 전용 커스텀 SVG 네비게이션 사용
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
              onVideoLoad={handleVideoLoad}
              onVideoStart={handleVideoStart}
              onVideoEnd={handleVideoEnd}
            />
          </SwiperSlide>
        ))}
      </Swiper>
      {/* [추가] 히어로 전용 좌우 네비게이션 — 다른 Swiper에는 영향 없음 */}
      <button
        type="button"
        className="hero-nav hero-nav--prev"
        aria-label="이전 작품 보기"
        onClick={() => swiperRef.current?.slidePrev()}
      >
        <img src="/icons/hero-nav-left.svg" alt="" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="hero-nav hero-nav--next"
        aria-label="다음 작품 보기"
        onClick={() => swiperRef.current?.slideNext()}
      >
        <img src="/icons/hero-nav-right.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  );
};

export default HeroSection;
