import React from "react";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
import ReleaseCard from "./ReleaseCard";

// 공개예정작 — 시안: 기대해도 좋을 새로운 이야기
// - 데이터: 개봉 예정 영화(useMovieStore.upcoming) 중 오늘 이후 공개작 (없으면 전체)
// - PC 한 줄 4장 + 화살표 슬라이드 (.rail-release)
const ComingSoon = () => {
  const upcoming = useMovieStore((s) => s.upcoming);

  const today = new Date().toISOString().slice(0, 10);
  const withPoster = upcoming.filter((m) => m.poster_path);
  const future = withPoster.filter((m) => m.release_date && m.release_date >= today);
  const items = (future.length > 0 ? future : withPoster).slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="member-section member-coming">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">기대해도 좋을 새로운 이야기</h2>
            <p className="member-desc">앞으로 공개될 새로운 영화와 시리즈를 미리 만나보세요.</p>
          </div>
        </div>

        <Rail className="rail-release" label="공개예정작">
          {items.map((m) => (
            <SwiperSlide key={`movie_${m.id}`}>
              <ReleaseCard item={m} type="movie" />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default ComingSoon;
