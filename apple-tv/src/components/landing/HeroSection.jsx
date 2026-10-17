import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";

// Swiper 기본 스타일
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// 커스텀 SCSS 불러오기
import "../../App.scss";

// 개별 영화 슬라이드 아이템
const HeroItem = ({ movie, isSwiping }) => {
  const { popVideo, onFetchVideo } = useMovieStore();
  const [hover, setHover] = useState(false);

  // 마우스 오버 시 비디오 요청
  useEffect(() => {
    if (hover && movie?.id) {
      onFetchVideo(movie.id);
    }
  }, [hover, movie?.id, onFetchVideo]);

  // 슬라이드가 넘어갈 때 hover 해제
  useEffect(() => {
    if (isSwiping) setHover(false);
  }, [isSwiping]);

  const videoList = popVideo?.[movie.id] || [];
  const trailer = videoList.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "";

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
          backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
        }}
      >
        {hover && trailer && (
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1`}
            title={trailer.name}
            allow="autoplay"
          />
        )}
      </div>

      {/* 오버레이 그라데이션 */}
      <div className="hero-overlay" />

      {/* 영화 상세 정보 */}
      <div className="hero-info">
        <h2 className="hero-title">{movie.title}</h2>
        <div className="hero-meta">
          {releaseYear && <span className="release-year">{releaseYear}</span>}
          <span className="age-rating">15+</span>
        </div>
        <p className="hero-overview">{movie.overview}</p>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const { popMovie, onFetchPopular } = useMovieStore();
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    if (!popMovie || popMovie.length === 0) {
      onFetchPopular();
    }
  }, [popMovie, onFetchPopular]);

  if (!popMovie || popMovie.length === 0) return null;

  // 상위 6개 영화 선택
  const heroMovies = popMovie.slice(0, 6);

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
        {heroMovies.map((movie) => (
          <SwiperSlide key={movie.id}>
            <HeroItem movie={movie} isSwiping={isSwiping} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default HeroSection;