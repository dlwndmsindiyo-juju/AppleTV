import React from "react";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
import ReleaseCard from "./ReleaseCard";
import ShowcaseCard, { useIsDesktop } from "./ShowcaseCard"; // [추가] PC 가로형 카드 (마우스를 올리면 커짐)
import MemberSectionHead from "./MemberSectionHead"; // [정리] 섹션 머리 공용

// 신규출시 — 시안: 지금, 새로운 작품을 만나보세요
// - 데이터: Apple TV+ 오리지널(useMovieStore.appleOriginals) 중 최근 공개 순
// - [수정] PC: 가로형 카드 346 × 214 (ShowcaseCard · 마우스를 올리면 450 × 280 + 정보 · 재생 · 찜) · 간격 28
//   태블릿 · 휴대폰: 기존 카드(ReleaseCard) 그대로
// - 전체 보기 → /browse/new

// [추가] 신규출시 목록 (홈 섹션 · 전체 보기 페이지 공용)
export const useNewReleaseItems = (limit = 10) => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const today = new Date().toISOString().slice(0, 10);
  return appleOriginals
    .filter((tv) => tv.poster_path && tv.first_air_date && tv.first_air_date <= today)
    .sort((a, b) => b.first_air_date.localeCompare(a.first_air_date))
    .slice(0, limit);
};

const NewRelease = () => {
  const items = useNewReleaseItems(10);
  const isDesktop = useIsDesktop();

  if (items.length === 0) return null;

  return (
    <section className="member-section member-newrelease">
      <div className="inner">
        <MemberSectionHead
          title="지금, 새로운 작품을 만나보세요"
          desc="새롭게 공개된 영화와 시리즈를 지금 바로 만나보세요."
          moreTo="/browse/new"
        />

        <Rail className={`rail-release${isDesktop ? " rail-showcase" : ""}`} label="신규출시" desktopGap={28}>
          {items.map((tv) => (
            <SwiperSlide key={`tv_${tv.id}`}>
              {isDesktop ? <ShowcaseCard item={tv} type="tv" variant="new" /> : <ReleaseCard item={tv} type="tv" variant="new" />}
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default NewRelease;
