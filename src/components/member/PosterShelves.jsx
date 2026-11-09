// src/components/member/PosterShelves.jsx
// [추가] 로그인 후 메인 — TMDB 로 채우는 섹션 (data/posterShelves.js 의 id 로 사용)
// - <Shelf id="movie-top10" />: design "top10" → 맨 위 인기 콘텐츠(Top10Section)와 같은 디자인
// - <Shelf id="all-movies" />: "Apple 추천" 카드와 같은 크기 · 슬라이드 · 버튼 · 평점 · 글자 없이 포스터만 (+ 전체 보기)
// - <GenreCollection />: 장르별 모음 — 장르 카드 한 줄 (그 장르 인기작 배경) · 누르면 /browse/genre-xxx (전체 보기와 같은 구성)
// - 데이터를 받는 동안은 뼈대 화면 · 받은 작품이 없으면 섹션을 숨김
// - 스타일: member.scss .member-ps-* · .member-genre-*
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import { SectionSkeleton } from "../common/Skeleton";
import MemberSectionHead from "./MemberSectionHead";
import Top10Section from "../landing/Top10Section";
import { img, detailPath } from "./memberUtils";
import { POSTER_SHELVES, GENRE_COLLECTION } from "../../data/posterShelves";
import { loadShelf } from "./posterShelfData";

// 섹션 데이터 (null = 불러오는 중)
const useShelf = (id) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    setItems(null);
    loadShelf(id)
      .then((list) => alive && setItems(list))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [id]);
  return items;
};

// 포스터 카드 — 누르면 상세
const PosterCard = ({ item }) => {
  const type = item.media_type === "tv" ? "tv" : "movie";
  const title = item.title || item.name;
  return (
    <Link to={detailPath(type, item.id)} className="member-ps-card" aria-label={`${title} 상세 보기`}>
      <img className="member-ps-poster" src={img(item.poster_path, "w500")} alt="" loading="lazy" />
    </Link>
  );
};

export const Shelf = ({ id }) => {
  const shelf = POSTER_SHELVES[id];
  const items = useShelf(id);
  if (!shelf) return null;
  if (items === null) return <SectionSkeleton count={shelf.design === "top10" ? 5 : 6} shape="poster" />;
  if (items.length === 0) return null;

  // 영화 · 시리즈 TOP 10: 맨 위 인기 콘텐츠와 같은 디자인
  if (shelf.design === "top10") return <Top10Section title={shelf.title} items={items} />;

  return (
    <section className="member-section member-recommend member-ps" aria-label={shelf.title}>
      <div className="inner">
        <MemberSectionHead title={shelf.title} moreTo={shelf.more ? `/browse/${id}` : undefined} />
        <Rail className="rail-poster rail-recommend" label={shelf.title} desktopGap={28}>
          {items.map((item) => (
            <SwiperSlide key={`${item.media_type}_${item.id}`}>
              <PosterCard item={item} />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

// 장르 카드 — 그 장르 첫 작품의 배경 이미지 + 장르 이름
const GenreCard = ({ id }) => {
  const shelf = POSTER_SHELVES[id];
  const items = useShelf(id);
  const cover = items?.find((r) => r.backdrop_path);
  return (
    <Link to={`/browse/${id}`} className="member-genre-card" aria-label={`${shelf.title} 장르 작품 모두 보기`}>
      {cover && <img className="member-genre-bg" src={img(cover.backdrop_path, "w780")} alt="" loading="lazy" />}
      <span className="member-genre-name">{shelf.title}</span>
    </Link>
  );
};

export const GenreCollection = () => (
  <section className="member-section member-genre" aria-label="장르별 모음">
    <div className="inner">
      <MemberSectionHead title="장르별 모음" />
      <Rail className="rail-continue rail-genre" label="장르별 모음" desktopGap={28}>
        {GENRE_COLLECTION.map((id) => (
          <SwiperSlide key={id}>
            <GenreCard id={id} />
          </SwiperSlide>
        ))}
      </Rail>
    </div>
  </section>
);
