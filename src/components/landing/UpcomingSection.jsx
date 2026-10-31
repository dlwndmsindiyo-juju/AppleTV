import React, { useEffect } from "react";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
// 로그인 후 메인 공개예정작(ComingSoon)과 같은 카드 사용
import ReleaseCard from "../member/ReleaseCard";

// 공개예정작 — 시안: 기대해도 좋을 새로운 이야기 (로그인 전 메인)
// - 카드 · 버튼 · 슬라이드는 로그인 후 메인과 동일 (ReleaseCard · .rail-release)
// - 데이터: 개봉 예정 영화 중 오늘 이후 공개작을 가까운 날짜순 (없으면 받아온 목록 그대로)
// - PC 한 줄 4장 + 화살표 슬라이드
const UpcomingSection = ({
  title = "기대해도 좋을 새로운 이야기",
  desc = "앞으로 공개될 새로운 영화와 시리즈를 미리 만나보세요.",
}) => {
  const upcoming = useMovieStore((s) => s.upcoming);
  const onFetchUpcoming = useMovieStore((s) => s.onFetchUpcoming);

  useEffect(() => {
    onFetchUpcoming();
  }, [onFetchUpcoming]);

  const today = new Date().toISOString().slice(0, 10);
  const withPoster = (upcoming || []).filter((m) => m.poster_path);
  const future = withPoster
    .filter((m) => m.release_date && m.release_date >= today)
    .sort((a, b) => a.release_date.localeCompare(b.release_date));
  const items = (future.length > 0 ? future : withPoster).slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="upcoming-section">
      <div className="inner">
        <h3 className="upcoming-title">{title}</h3>
        <p className="upcoming-desc">{desc}</p>

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

export default UpcomingSection;
