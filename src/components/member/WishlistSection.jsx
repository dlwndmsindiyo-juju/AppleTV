import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SwiperSlide } from "swiper/react";
import { useHeartStore, toggleWish, wishKey } from "../../store/useHeartStore"; // 위시리스트 (Firestore)
import Rail from "../common/Rail";
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenreName } from "./useContentInfo";
import MemberSectionHead from "./MemberSectionHead"; // [정리] 섹션 머리 공용

// 마음에 담아둔 이야기 (위시리스트) — 배경 그라데이션 띠 + 가로 카드 4장 슬라이드
// - 카드: 포스터 · 제목 · "액션 · 시리즈 · 스릴러" (키워드 · 장르 · 실제 Apple Original 이면 "Apple Original") · +
// - + 버튼: 내 위시리스트에 추가
//   · 아직 안 담은 작품 → 위시리스트에 담고 "어떤 그룹에 추가할까요?" 팝업
//   · 이미 담은 작품 → 바로 그룹 고르기 팝업 (위시리스트 페이지의 그룹에 추가)
// - [추가] 휴대폰(767px 이하) 시안: 슬라이드 대신 세로 3줄 목록 (.member-wl-list)
// - [수정] 담은 작품이 없으면(첫 로그인 등) 추천 작품 없이 안내 문구만 (.member-empty)

// 휴대폰 화면인지 (화면 폭이 바뀌면 다시 계산)
const PHONE_QUERY = "(max-width: 767px)";
const useIsPhone = () => {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isPhone;
};

const WishCard = ({ item }) => {
  const info = useContentInfo(item.type, item.id);
  const key = wishKey(item.type, item.id);
  const wished = useHeartStore((s) => Boolean(s.items[key]));
  const onOpenPicker = useHeartStore((s) => s.onOpenPicker);

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
          <span className="member-wl-meta">{contentMeta(item.type, info, (item.genres || []).map(shortGenreName))}</span>
        </span>
      </Link>
      <button type="button" className="member-wl-add" aria-label={`${item.name} 위시리스트에 추가`} onClick={handleAdd}>
        <span className="ui-icon ui-icon-plus" aria-hidden="true" />
      </button>
    </div>
  );
};

const WishlistSection = () => {
  const isPhone = useIsPhone();

  // 위시리스트: 최근에 담은 순서
  const wishItems = useHeartStore((s) => s.items);
  const wishlist = Object.values(wishItems)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((w) => ({ id: w.id, name: w.title, poster_path: w.poster_path, type: w.type, genres: w.genres }));
  const ready = useHeartStore((s) => s.ready); // 위시리스트를 다 불러왔는지

  // [수정] 저장한 작품이 없으면(첫 로그인 · 모두 뺀 경우) 추천 작품(Apple 오리지널)을 채우지 않고 안내 문구만
  const items = wishlist.slice(0, 10);

  return (
    <section className="member-section band member-wishlist">
      <div className="inner">
        <MemberSectionHead title="나의 목록" desc="관심 있는 작품을 모아두고 언제든 다시 만나보세요." moreTo={items.length > 0 ? "/wishlist" : undefined} /> {/* [수정] 담은 작품이 있을 때만 전체 보기 */}

        {items.length === 0 ? (
          // [추가] 담은 작품이 없을 때 안내 (불러오는 동안은 비워 둠 · 문구가 잠깐 보였다 사라지지 않게)
          ready && (
            <p className="member-empty member-wl-empty">
              아직 나의 목록에 담은 작품이 없어요.
            </p>
          )
        ) : isPhone ? (
          // 휴대폰: 세로 3줄 목록
          <ul className="member-wl-list" aria-label="마음에 담아둔 이야기">
            {items.slice(0, 3).map((item) => (
              <li key={`${item.type}_${item.id}`}>
                <WishCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <Rail bleed={false} className="rail-wish" label="마음에 담아둔 이야기" desktopGap={28}>
            {items.map((item) => (
              <SwiperSlide key={`${item.type}_${item.id}`}>
                <WishCard item={item} />
              </SwiperSlide>
            ))}
          </Rail>
        )}
      </div>
    </section>
  );
};

export default WishlistSection;
