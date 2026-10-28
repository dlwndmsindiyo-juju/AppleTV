// 예시: src/components/common/MovieSlider.jsx
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function MovieSlider({ movies = [], title = "인기 콘텐츠" }) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="movie-slider-section" style={{ padding: '20px 0' }}>
      <div className="inner">
      <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>{title}</h3>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
        }}
      >
        {movies.map((movie) => (
          <SwiperSlide key={movie.id}>
            <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#181a21' }}>
              <img 
                src={`https://image.tmdb.org/t/p/w500${movie.backdrop_path || movie.poster_path}`} 
                alt={movie.title || movie.name}
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
              <div style={{ padding: '12px', color: '#fff' }}>
                <h4 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>{movie.title || movie.name}</h4>
                <p style={{ fontSize: '12px', color: '#b8bdc9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {movie.overview}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      </div>
    </div>
  );
}