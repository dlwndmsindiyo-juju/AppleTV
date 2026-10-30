import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import { img, detailPath, MOVIE_GENRES, TV_GENRES } from "./memberUtils";
import { useContentInfo, contentMeta } from "./useContentInfo";

// Apple이 모두에게 추천하는 작품 — 시안: 포스터 카드 + 아래 그림자 위에 제목 · 설명 · [재생] [★ 평점]
// - 데이터: 이번 주 인기 영화 + 시리즈를 번갈아 섞음 (useMovieStore.recommendedMix)
//   · 탑텐(Apple TV+ 오리지널)에 있는 작품은 빼서 겹치지 않게
// - 설명 줄: "영화 · 액션 · 스릴러" / 실제 Apple Original 이면 "영화 · 액션 · Apple Original"
// - 재생: 상세 페이지에서 바로 재생 (?play=1)
// - ★ 평점: 상세 페이지의 "작품 평점"으로 이동 (#rating)
// - 카드(포스터 · 제목)를 누르면 상세 페이지

const RecommendCard = ({ item }) => {
  const type = item.media_type === "tv" ? "tv" : "movie";
  const title = item.title || item.name;
  const info = useContentInfo(type, item.id);
  const genreMap = type === "tv" ? TV_GENRES : MOVIE_GENRES;
  const genres = (item.genre_ids || []).map((id) => genreMap[id]).filter(Boolean);
  const path = detailPath(type, item.id);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "-";

  return (
    <div className="member-rc-card">
      <Link to={path} className="member-rc-link" aria-label={`${title} 상세 보기`}>
        <img className="member-rc-poster" src={img(item.poster_path, "w500")} alt="" loading="lazy" />
        <span className="member-rc-info">
          <strong className="member-rc-title">{title}</strong>
          <span className="member-rc-meta">{contentMeta(type, genres, info?.original)}</span>
        </span>
      </Link>
      <div className="member-rc-actions">
        <Link to={`${path}?play=1`} className="member-rc-play" aria-label={`${title} 재생`}>
          <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
          재생
        </Link>
        <Link to={`${path}#rating`} className="member-rc-rate" aria-label={`${title} 평점 ${rating} · 작품 평점으로 이동`}>
          {/* 시안: 흰색으로 채운 별 (star-icon.svg 는 테두리만 있어 직접 그림) */}
          <svg className="member-rc-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor" />
          </svg>
          {rating}
        </Link>
      </div>
    </div>
  );
};

const RecommendSection = () => {
  const recommendedMix = useMovieStore((s) => s.recommendedMix);
  const onFetchRecommendedMix = useMovieStore((s) => s.onFetchRecommendedMix);
  const appleOriginals = useMovieStore((s) => s.appleOriginals);

  useEffect(() => {
    onFetchRecommendedMix();
  }, [onFetchRecommendedMix]);

  // 탑텐(Apple TV+ 오리지널 시리즈)과 겹치지 않게
  const originalIds = new Set(appleOriginals.map((tv) => tv.id));
  const items = recommendedMix
    .filter((item) => !(item.media_type === "tv" && originalIds.has(item.id)))
    .slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="member-section member-recommend">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">Apple이 모두에게 추천하는 작품</h2>
            <p className="member-desc">지금 꼭 봐야할, Apple이 엄선한 특별한 콘텐츠를 만나보세요.</p>
          </div>
        </div>

        <Rail className="rail-poster rail-recommend" label="Apple이 모두에게 추천하는 작품">
          {items.map((item) => (
            <SwiperSlide key={`${item.media_type}_${item.id}`}>
              <RecommendCard item={item} />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default RecommendSection;
