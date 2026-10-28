import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";

import "swiper/css";
import "swiper/css/navigation";

// 오리지널스 (TMDB 에서 애플 TV+ 방송사로 분류된 시리즈)
// - 시안: PC 5장(마지막 장 잘림) / 태블릿 · 모바일은 오른쪽 끝까지 이어지는 슬라이드
// - 슬라이드 폭은 CSS(.apple-originals-slide): PC 282 / 태블릿 280 / 모바일 140
const AppleOriginals = ({
  title = "오리지널스",
  desc = "Apple TV에서만 만날 수 있는 오리지널 시리즈",
}) => {
  const { appleOriginals, onFetchAppleOriginals } = useMovieStore();

  useEffect(() => {
    onFetchAppleOriginals();
  }, [onFetchAppleOriginals]);

  // 포스터가 있는 작품만 최대 10개 (데이터가 없으면 섹션 숨김)
  const items = (appleOriginals || [])
    .filter((tv) => tv.poster_path)
    .slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="apple-originals">
      <div className="inner">
        <h3 className="apple-originals-title">{title}</h3>
        {desc && <p className="apple-originals-desc">{desc}</p>}

        <Swiper
          className="apple-originals-swiper"
          modules={[Navigation]}
          navigation
          slidesPerView="auto"
          spaceBetween={16} // 모바일
          breakpoints={{
            768: { spaceBetween: 24 },
          }}
        >
          {items.map((tv) => (
            <SwiperSlide key={tv.id} className="apple-originals-slide">
              <Link to={`/detail/${tv.id}`} className="apple-card">
                <div className="apple-card-poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
                    alt={tv.name}
                    loading="lazy"
                  />
                </div>
                <h4 className="apple-card-title">{tv.name}</h4>
                <span className="apple-card-meta">
                  {tv.first_air_date ? tv.first_air_date.slice(0, 4) : "-"}
                </span>
                <span className="apple-card-meta">
                  <img className="star-icon" src="/icons/star-icon.svg" alt="" aria-hidden="true" />
                  {tv.vote_average ? tv.vote_average.toFixed(1) : "-"}
                </span>
                <span className="apple-card-badge">Apple Original</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default AppleOriginals;
