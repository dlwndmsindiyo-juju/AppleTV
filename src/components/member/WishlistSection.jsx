import React from "react";
import { Link } from "react-router-dom";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import { useHeartStore, toggleWish, wishKey } from "../../store/useHeartStore"; // 위시리스트 (Firestore)
import Rail from "../common/Rail";
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta } from "./useContentInfo";

// 마음에 담아둔 이야기 (위시리스트) — 배경 그라데이션 띠 + 가로 카드 4장 슬라이드
// - 카드: 포스터 · 제목 · "시리즈 · 액션 · 스릴러" (실제 Apple Original 이면 "Apple Original") · +
// - + 버튼: 내 위시리스트에 추가
//   · 아직 안 담은 작품 → 위시리스트에 담고 "어떤 그룹에 추가할까요?" 팝업
//   · 이미 담은 작품 → 바로 그룹 고르기 팝업 (위시리스트 페이지의 그룹에 추가)

const WishCard = ({ item }) => {
  const info = useContentInfo(item.type, item.id);
  const key = wishKey(item.type, item.id);
  const wished = useHeartStore((s) => Boolean(s.items[key]));
  const onOpenPicker = useHeartStore((s) => s.onOpenPicker);
  const genres = item.genres?.length ? item.genres : info?.genres || [];

  const handleAdd = () => {
    if (wished) onOpenPicker(key);
    else toggleWish({ id: item.id, type: item.type, title: item.name, poster_path: item.poster_path });
  };

  return (
    <div className="member-wl-card">
      <Link to={detailPath(item.type, item.id)} className="member-wl-link">
        <span className="member-wl-thumb">
          {item.poster_path && <img src={img(item.poster_path, "w154")} alt="" loading="lazy" />}
        </span>
        <span className="member-wl-info">
          <strong className="member-wl-name">{item.name}</strong>
          <span className="member-wl-meta">{contentMeta(item.type, genres, info?.original)}</span>
        </span>
      </Link>
      <button type="button" className="member-wl-add" aria-label={`${item.name} 위시리스트에 추가`} onClick={handleAdd}>
        <span className="ui-icon ui-icon-plus" aria-hidden="true" />
      </button>
    </div>
  );
};

const WishlistSection = () => {
  // 위시리스트: 최근에 담은 순서
  const wishItems = useHeartStore((s) => s.items);
  const wishlist = Object.values(wishItems)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((w) => ({ id: w.id, name: w.title, poster_path: w.poster_path, type: w.type, genres: w.genres }));
  const appleOriginals = useMovieStore((s) => s.appleOriginals);

  // 저장한 작품이 없으면 Apple 오리지널을 샘플로 보여줌 (+ 로 바로 담을 수 있음)
  const items = (
    wishlist.length > 0
      ? wishlist
      : appleOriginals.map((tv) => ({
          id: tv.id,
          name: tv.name,
          poster_path: tv.poster_path,
          type: "tv",
        }))
  ).slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="member-section band member-wishlist">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">마음에 담아둔 이야기</h2>
            <p className="member-desc">관심 있는 작품을 모아두고 언제든 다시 만나보세요.</p>
          </div>
          <Link to="/wishlist" className="member-more">더보기</Link>
        </div>

        <Rail bleed={false} className="rail-wish" label="마음에 담아둔 이야기">
          {items.map((item) => (
            <SwiperSlide key={`${item.type}_${item.id}`}>
              <WishCard item={item} />
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default WishlistSection;
