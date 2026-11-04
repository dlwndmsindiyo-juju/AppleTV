import React, { useEffect, useMemo } from "react";
import { useMovieStore } from "../../store/useMovieStore";
import { useHeartStore } from "../../store/useHeartStore";
import { useAuthStore } from "../../store/useAuthStore";
import { isResumable, useWatchConnect, useWatchStore } from "../../store/useWatchStore";
import { img } from "../member/memberUtils";
import { TvBrowseScreen } from "./TvRows";

// TV 홈 (OTT) — 웹 로그인 후 홈과 같은 섹션 · 같은 데이터, 레이아웃만 TV 카드 (TvRows.jsx · TV.scss)
// 이어보기 → 찜 → TOP 10 → 추천작 → 신규출시 → 공개예정작
// - [수정] AI 어시스트는 섹션 대신 왼쪽 메뉴의 "AI" (팝업)
// - 각 섹션의 고르는 규칙(개수 · 순서 · 제외)은 웹 컴포넌트와 같음
// - 카드 이미지는 가로형이라 TMDB 가로 이미지(backdrop) 우선, 없으면 포스터
// - 배경: TOP 10 첫 작품의 가로 이미지 (효과는 스포츠와 같음: 사진 58% + 검정 80%)

const wide = (item) => img(item?.backdrop_path || item?.poster_path, "w780");
const card = (item, type) => ({
  id: `${type || item.media_type || "tv"}_${item.id}`,
  title: item.title || item.name,
  image: wide(item),
});

const useTvHomeRows = () => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const upcoming = useMovieStore((s) => s.upcoming);
  const recommendedMix = useMovieStore((s) => s.recommendedMix);
  const onFetchAppleOriginals = useMovieStore((s) => s.onFetchAppleOriginals);
  const onFetchUpcoming = useMovieStore((s) => s.onFetchUpcoming);
  const onFetchRecommendedMix = useMovieStore((s) => s.onFetchRecommendedMix);

  const uid = useAuthStore((s) => s.user?.uid);
  useWatchConnect(uid);
  const history = useWatchStore((s) => s.items);
  const wishItems = useHeartStore((s) => s.items);

  useEffect(() => {
    onFetchAppleOriginals();
    onFetchUpcoming();
    onFetchRecommendedMix();
  }, [onFetchAppleOriginals, onFetchUpcoming, onFetchRecommendedMix]);

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const originalIds = new Set(appleOriginals.map((tv) => tv.id));

    // 이어보기 (끝까지 본 작품 제외)
    const continueRow = history.filter(isResumable).map((h) => ({
      id: `${h.type}_${h.id}`,
      title: h.title,
      image: wide(h),
    }));

    // 찜 (최근에 담은 순)
    const wishRow = Object.values(wishItems || {})
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 10)
      .map((w) => ({ id: `${w.type}_${w.id}`, title: w.title, image: wide(w) }));

    // TOP 10 (Apple TV+ 오리지널 인기순)
    const top10 = appleOriginals.filter((tv) => tv.poster_path).slice(0, 10);

    // 추천작 (TOP 10 과 겹치는 시리즈 제외)
    const recommend = (recommendedMix || [])
      .filter((item) => !(item.media_type === "tv" && originalIds.has(item.id)))
      .slice(0, 10);

    // 신규출시 (이미 공개된 오리지널 · 최신순)
    const newRelease = appleOriginals
      .filter((tv) => tv.poster_path && tv.first_air_date && tv.first_air_date <= today)
      .sort((a, b) => b.first_air_date.localeCompare(a.first_air_date))
      .slice(0, 10);

    // 공개예정작 (오늘 이후 공개 · 없으면 전체)
    const withPoster = (upcoming || []).filter((m) => m.poster_path);
    const future = withPoster.filter((m) => m.release_date && m.release_date >= today);
    const coming = (future.length > 0 ? future : withPoster).slice(0, 10);

    return {
      bg: top10[0]?.backdrop_path ? img(top10[0].backdrop_path, "original") : "",
      rows: [
        { id: "continue", title: "멈춘 순간부터 다시", items: continueRow },
        { id: "wishlist", title: "마음에 담아둔 이야기", items: wishRow },
        { id: "top10", title: "지금 가장 주목받는 작품", items: top10.map((tv) => card(tv, "tv")) },
        { id: "recommend", title: "Apple이 모두에게 추천하는 작품", items: recommend.map((m) => card(m)) },
        { id: "new", title: "지금, 새로운 작품을 만나보세요", items: newRelease.map((tv) => card(tv, "tv")) },
        { id: "coming", title: "기대해도 좋을 새로운 이야기", items: coming.map((m) => card(m, "movie")) },
      ].filter((row) => row.items.length > 0),
    };
  }, [appleOriginals, upcoming, recommendedMix, history, wishItems]);
};

// onDetail(item): [추가] 작품 상세 페이지 열기 (TvDetail · OTT)
export const TvHome = ({ onMenu, onDetail }) => {
  const { rows, bg } = useTvHomeRows();
  // 카드 id 는 "movie_123" · "tv_456" → 상세 항목
  const handleItem = (rowId, item) => {
    const [type, id] = String(item.id).split("_");
    if (!id) return;
    onDetail?.({ kind: "ott", key: `ott-${item.id}`, type: type === "tv" ? "tv" : "movie", id: Number(id), title: item.title, image: item.image });
  };
  return <TvBrowseScreen menu="홈" onMenu={onMenu} rows={rows} bg={bg} onItem={handleItem} />;
};

export default TvHome;
