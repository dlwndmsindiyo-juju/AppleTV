import React from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";

import "swiper/css";
import "swiper/css/navigation";

// 인기 영화 TOP 10 (popMovie 의 앞 10개 사용)
// - 슬라이드 폭은 CSS(.top10-slide)에서 화면별로 고정: PC 282 / 태블릿 190 / 모바일 135
const Top10Section = ({ title = "TOP 10" }) => {
  const { popMovie } = useMovieStore();

  if (!popMovie || popMovie.length === 0) return null;

  const top10 = popMovie.slice(0, 10);

  return (
    <section className="top10-section">
      <div className="inner">
        <h3 className="top10-title">{title}</h3>

        <Swiper
          className="top10-swiper"
          modules={[Navigation]}
          navigation
          slidesPerView="auto"
          spaceBetween={16} // 모바일
          breakpoints={{
            768: { spaceBetween: 32 }, // 태블릿
            1025: { spaceBetween: 24 }, // 데스크톱
          }}
        >
          {top10.map((movie, index) => (
            <SwiperSlide key={movie.id} className="top10-slide">
              <Link to={`/detail/${movie.id}`} className="top10-card">
                <div className="top10-poster">
                  {movie.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      loading="lazy"
                    />
                  )}

                  {/* 마우스 호버 시 영화 이름 + 평점 */}
                  <div className="top10-hover">
                    <strong className="top10-movie-title">{movie.title}</strong>
                    <span className="top10-rating">
                      ★ {movie.vote_average ? movie.vote_average.toFixed(1) : "-"}
                    </span>
                  </div>
                </div>

                {/* 순위 숫자 */}
                <span className="top10-rank" aria-label={`${index + 1}위`}>
                  {index + 1}
                </span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Top10Section;
