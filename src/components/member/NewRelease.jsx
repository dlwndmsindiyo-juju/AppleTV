import React from "react";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
import ReleaseCard from "./ReleaseCard";

// 신규출시 — 시안: 지금, 새로운 작품을 만나보세요
// - 데이터: Apple TV+ 오리지널(useMovieStore.appleOriginals) 중 최근 공개 순
// - PC 한 줄 4장 + 화살표 슬라이드 (.rail-release)
const NewRelease = () => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);

  const today = new Date().toISOString().slice(0, 10);
  const items = appleOriginals
    .filter((tv) => tv.poster_path && tv.first_air_date && tv.first_air_date <= today)
    .sort((a, b) => b.first_air_date.localeCompare(a.first_air_date))
    .slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="member-section member-newrelease">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">지금, 새로운 작품을 만나보세요</h2>
            <p className="member-desc">새롭게 공개된 영화와 시리즈를 지금 바로 만나보세요.</p>
          </div>
        </div>

        <Rail className="rail-release" label="신규출시">
          {items.map((tv) => (
            <SwiperSlide key={`tv_${tv.id}`}>
              <ReleaseCard item={tv} type="tv" />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default NewRelease;
