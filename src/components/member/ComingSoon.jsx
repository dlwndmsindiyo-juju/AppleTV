import React from "react";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
import ShowcaseCard from "./ShowcaseCard"; // [추가] PC 가로형 카드 ("N월 공개" 상자)
import MemberSectionHead from "./MemberSectionHead"; // [정리] 섹션 머리 공용

// 공개예정작 — 시안: 곧 찾아올 새로운 이야기
// - 데이터: 개봉 예정 영화(useMovieStore.upcoming) 중 오늘 이후 공개작 (없으면 전체)
// - [수정] PC: 가로형 카드 346 × 214 (ShowcaseCard · 왼쪽 아래 "N월 공개") · 간격 28
//   [수정] 태블릿 · 휴대폰: 같은 가로형 카드 + 카드 아래 정보 (호버 없음)
// - 전체 보기 → /browse/soon

// [추가] 공개예정작 목록 (홈 섹션 · 전체 보기 페이지 공용)
export const useComingSoonItems = (limit = 10) => {
  const upcoming = useMovieStore((s) => s.upcoming);
  const today = new Date().toISOString().slice(0, 10);
  const withPoster = upcoming.filter((m) => m.poster_path);
  const future = withPoster.filter((m) => m.release_date && m.release_date >= today);
  return (future.length > 0 ? future : withPoster).slice(0, limit);
};

const ComingSoon = () => {
  const items = useComingSoonItems(10);

  if (items.length === 0) return null;

  return (
    <section className="member-section member-coming">
      <div className="inner">
        <MemberSectionHead
          title="공개 예정"
          desc="앞으로 공개될 새로운 영화와 시리즈를 미리 만나보세요."
          moreTo="/browse/soon"
        />

        <Rail className="rail-release rail-showcase" label="공개예정작" desktopGap={28}>
          {items.map((m) => (
            <SwiperSlide key={`movie_${m.id}`}>
              <ShowcaseCard item={m} type="movie" variant="soon" />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default ComingSoon;
