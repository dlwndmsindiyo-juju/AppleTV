import React, { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";

import "swiper/css";
import "swiper/css/navigation";

// 지금 가장 주목받는 작품 — Apple TV+ 오리지널 인기순 TOP 10
// - 데이터: TMDB Apple TV+(방송사 2552) 시리즈 인기순 (useMovieStore.appleOriginals 의 앞 10개)
// - 시안: 큰 순위 숫자(테두리 Light/500 3px · 안쪽 Linear 그라데이션)가 포스터 왼쪽 뒤에 겹침
// - 포스터에 마우스를 올리면 제목 + 평점 (기존 그대로)
// - 로그인 전 홈 · 로그인 후 홈 · 무료 체험 안내 세 화면 공용 (제목 문구도 같음)
// - 슬라이드 폭은 CSS(.top10-slide): PC 한 줄 4장 / 태블릿 · 모바일 고정 폭
const TITLE = "지금 가장 주목받는 작품";
const DESC = "많은 사랑을 받고 있는 인기 콘텐츠 TOP 10을 만나보세요.";

// 순위 숫자 (SVG)
// - 테두리는 글자 바깥쪽에만: 테두리 층에서 글자 안쪽을 마스크로 지움 → 반투명 안쪽 그라데이션 아래로 테두리가 비치지 않음
// - 색은 CSS(.top10-num)에서 _variables 토큰으로 지정
const RankNumber = ({ rank }) => {
  const uid = useId().replace(/:/g, "");
  const gradientId = `top10-num-fill-${uid}`;
  const maskId = `top10-num-mask-${uid}`;
  const text = String(rank);
  const width = text.length * 100; // 글자 수만큼 가로 폭
  const glyph = { x: 0, y: 132, textAnchor: "start" };

  return (
    <svg className="top10-num" viewBox={`0 0 ${width} 140`} aria-hidden="true" focusable="false">
      <defs>
        {/* 시안 Linear: 아래 검정 → 위 회색(투명) */}
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop className="top10-num-stop-start" offset="0%" />
          <stop className="top10-num-stop-end" offset="100%" />
        </linearGradient>
        {/* 글자 바깥만 보이게 하는 마스크 (흰색 = 보임, 검정 = 숨김) */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width={width + 40} height="180">
          <rect x="-20" y="-20" width={width + 40} height="180" fill="#fff" />
          <text {...glyph} className="top10-num-glyph" fill="#000">{text}</text>
        </mask>
      </defs>
      <text {...glyph} className="top10-num-glyph top10-num-stroke" fill="none" mask={`url(#${maskId})`}>
        {text}
      </text>
      <text {...glyph} className="top10-num-glyph" fill={`url(#${gradientId})`}>
        {text}
      </text>
    </svg>
  );
};

const Top10Section = () => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const onFetchAppleOriginals = useMovieStore((s) => s.onFetchAppleOriginals);

  useEffect(() => {
    onFetchAppleOriginals();
  }, [onFetchAppleOriginals]);

  if (!appleOriginals || appleOriginals.length === 0) return null;

  const top10 = appleOriginals.filter((tv) => tv.poster_path).slice(0, 10);

  return (
    <section className="top10-section">
      <div className="inner">
        <h3 className="top10-title">{TITLE}</h3>
        <p className="top10-desc">{DESC}</p>

        <Swiper
          className="top10-swiper"
          modules={[Navigation]}
          navigation
          slidesPerView="auto"
          spaceBetween={16} // 모바일
          breakpoints={{
            768: { spaceBetween: 24 }, // 태블릿
            1025: { spaceBetween: 24 }, // 데스크톱
          }}
        >
          {top10.map((tv, index) => (
            <SwiperSlide key={tv.id} className="top10-slide">
              <Link to={`/tv/${tv.id}`} className="top10-card" aria-label={`${index + 1}위 ${tv.name}`}>
                {/* 순위 숫자 (포스터 뒤) */}
                <RankNumber rank={index + 1} />

                <div className="top10-poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
                    alt={tv.name}
                    loading="lazy"
                  />

                  {/* 마우스 호버 시 작품 이름 + 평점 */}
                  <div className="top10-hover">
                    <strong className="top10-movie-title">{tv.name}</strong>
                    <span className="top10-rating">
                      ★ {tv.vote_average ? tv.vote_average.toFixed(1) : "-"}
                    </span>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Top10Section;
