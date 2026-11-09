import React, { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules"; // [수정] A11y: 키보드(Tab)로 화면 밖 카드를 고르면 그 카드가 보이게 밀어 줌
import { useMovieStore } from "../../store/useMovieStore";

import "swiper/css";
import "swiper/css/navigation";

// 지금 가장 주목받는 작품 — Apple TV+ 오리지널 인기순 TOP 10
// - 데이터: TMDB Apple TV+(방송사 2552) 시리즈 인기순 (useMovieStore.appleOriginals 의 앞 10개)
// - 시안: 큰 순위 숫자(테두리 Light/500 3px · 안쪽 Linear 그라데이션)가 포스터 왼쪽 뒤에 겹침
// - 포스터에 마우스를 올리면 제목 + 평점 (기존 그대로)
// - 로그인 전 홈 · 로그인 후 홈 · 무료 체험 안내 세 화면 공용 (제목 문구도 같음)
// - 슬라이드 폭은 CSS(.top10-slide): PC 한 줄 4장 / 태블릿 · 모바일 고정 폭
const TITLE = "인기 콘텐츠";

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

// [추가] title · items: 다른 TOP 10 (영화 TOP 10 · 시리즈 TOP 10 · PosterShelves.jsx)도 같은 디자인으로
// - items 를 넘기면 그 목록 (영화 · 시리즈 모두 · media_type 으로 상세 주소 구분) · 없으면 기존 Apple TV+ 오리지널
const Top10Section = ({ title = TITLE, items = null }) => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const onFetchAppleOriginals = useMovieStore((s) => s.onFetchAppleOriginals);

  useEffect(() => {
    if (!items) onFetchAppleOriginals();
  }, [items, onFetchAppleOriginals]);

  const source = items || appleOriginals;
  if (!source || source.length === 0) return null;

  const top10 = source.filter((tv) => tv.poster_path).slice(0, 10);

  return (
    <section className="top10-section">
      <div className="inner">
        {/* [수정] 소제목 없앰 · 제목 ↔ 콘텐츠 60px (App.scss) */}
        <h3 className="top10-title">{title}</h3>

        <Swiper
          className="top10-swiper"
          modules={[Navigation, A11y]}
          navigation
          slidesPerView="auto"
          spaceBetween={16} // 모바일
          breakpoints={{
            768: { spaceBetween: 24 }, // [수정] 태블릿 · 데스크톱 (태블릿도 PC 와 같음)
          }}
        >
          {top10.map((tv, index) => {
            const type = tv.media_type === "movie" ? "movie" : "tv"; // [추가] 영화 TOP 10 은 영화 상세로
            const name = tv.name || tv.title;
            return (
            <SwiperSlide
              key={`${type}_${tv.id}`}
              // 두 자리 순위(10위)는 숫자가 넓어 포스터에 가려지지 않게 숫자 자리를 넓힌 카드 (포스터 크기는 같음)
              className={`top10-slide${index + 1 >= 10 ? " top10-slide--wide" : ""}`}
            >
              <Link to={`/${type}/${tv.id}`} className="top10-card" aria-label={`${index + 1}위 ${name}`}>
                {/* 순위 숫자 (포스터 뒤) */}
                <RankNumber rank={index + 1} />

                <div className="top10-poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
                    alt={name}
                    loading="lazy"
                  />

                  {/* 마우스 호버 시 작품 이름 + 평점 */}
                  <div className="top10-hover">
                    <strong className="top10-movie-title">{name}</strong>
                    <span className="top10-rating">
                      ★ {tv.vote_average ? (tv.vote_average / 2).toFixed(1) : "-"} {/* [수정] 10점 → 5점 만점 */}
                    </span>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

export default Top10Section;
