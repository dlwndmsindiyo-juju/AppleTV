import React, { useEffect, useMemo, useState } from "react";
import { useMovieStore } from "../../store/useMovieStore";
import { useHeartStore } from "../../store/useHeartStore";
import { useAuthStore } from "../../store/useAuthStore";
import { isResumable, useWatchConnect, useWatchStore } from "../../store/useWatchStore";
import { img } from "../member/memberUtils";
import { TvBrowseScreen } from "./TvRows";
import { POSTER_SHELVES, GENRE_COLLECTION, BROWSE_LIMIT } from "../../data/posterShelves"; // [추가] 웹 로그인 후 메인과 같은 TMDB 섹션
import { loadShelf } from "../member/posterShelfData";

// TV 홈 (OTT) — 웹 로그인 후 홈과 같은 섹션 · 같은 데이터, 레이아웃만 TV 카드 (TvRows.jsx · TV.scss)
// 이어보기 → 찜 → TOP 10 → 추천작 → 신규출시 → 공개예정작
// - [추가] 로그인하면 웹 로그인 후 메인과 같은 순서 · 같은 섹션 (data/posterShelves.js · 웹 MemberHome.jsx)
//   이어보기 · 나의 목록 · 인기 콘텐츠 · Apple 추천 · 영화 TOP 10 · 모든 영화 · 최신작 · 시리즈 TOP 10 · 모든 시리즈
//   · 공개 예정 · 다큐멘터리 · 모든 다큐멘터리 · 장르별 모음 · 키즈 (AI 어시스트는 왼쪽 메뉴 "AI")
// - [추가] 장르별 모음 카드를 누르면 그 장르 화면 (TvGenre · 영화 · 시리즈 줄)
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

// [추가] TMDB 섹션 여러 개 불러오기 { id: items } (받기 전에는 없음) · enabled 가 false 면 요청 안 함
const useShelfMap = (ids, enabled = true, limit) => {
  const [map, setMap] = useState({});
  const key = ids.join(",");
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    ids.forEach((id) =>
      loadShelf(id, limit)
        .then((items) => alive && setMap((m) => ({ ...m, [id]: items })))
        .catch(() => alive && setMap((m) => ({ ...m, [id]: [] }))),
    );
    return () => {
      alive = false;
    };
  }, [key, enabled, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
};

const SHELF_IDS = ["movie-top10", "all-movies", "series-top10", "all-series", "documentary", "all-documentaries", "kids"];

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
  const loggedIn = Boolean(uid);
  const shelves = useShelfMap([...SHELF_IDS, ...GENRE_COLLECTION], loggedIn); // [추가] 로그인했을 때만

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

    // [추가] TMDB 섹션 한 줄 (제목은 웹과 같음)
    const shelfRow = (id) => ({ id, title: POSTER_SHELVES[id].title, items: (shelves[id] || []).map((m) => card(m)) });
    // [추가] 장르별 모음: 장르 카드 (그 장르 첫 작품 배경) · 누르면 장르 화면 (genre: id)
    const genreRow = {
      id: "genres",
      title: "장르별 모음",
      items: GENRE_COLLECTION.filter((id) => shelves[id]?.length).map((id) => {
        const cover = shelves[id].find((r) => r.backdrop_path) || shelves[id][0];
        return { id: `genre_${id}`, genre: id, title: POSTER_SHELVES[id].title, image: wide(cover) };
      }),
    };

    const base = {
      continue: { id: "continue", title: "멈춘 순간부터 다시", items: continueRow },
      wishlist: { id: "wishlist", title: "마음에 담아둔 이야기", items: wishRow },
      top10: { id: "top10", title: "지금 가장 주목받는 작품", items: top10.map((tv) => card(tv, "tv")) },
      recommend: { id: "recommend", title: "Apple이 모두에게 추천하는 작품", items: recommend.map((m) => card(m)) },
      new: { id: "new", title: "지금, 새로운 작품을 만나보세요", items: newRelease.map((tv) => card(tv, "tv")) },
      coming: { id: "coming", title: "기대해도 좋을 새로운 이야기", items: coming.map((m) => card(m, "movie")) },
    };

    // [수정] 로그인: 웹 로그인 후 메인과 같은 순서 / 로그인 전: 기존 6줄
    const rows = loggedIn
      ? [
          base.continue,
          base.wishlist,
          base.top10,
          base.recommend,
          shelfRow("movie-top10"),
          shelfRow("all-movies"),
          base.new,
          shelfRow("series-top10"),
          shelfRow("all-series"),
          base.coming,
          shelfRow("documentary"),
          shelfRow("all-documentaries"),
          genreRow,
          shelfRow("kids"),
        ]
      : [base.continue, base.wishlist, base.top10, base.recommend, base.new, base.coming];

    return {
      bg: top10[0]?.backdrop_path ? img(top10[0].backdrop_path, "original") : "",
      rows: rows.filter((row) => row.items.length > 0),
    };
  }, [appleOriginals, upcoming, recommendedMix, history, wishItems, loggedIn, shelves]);
};

// onDetail(item): [추가] 작품 상세 페이지 열기 (TvDetail · OTT)
// [추가] onGenre(id): 장르별 모음 카드 → 장르 화면
export const TvHome = ({ onMenu, onDetail, onGenre }) => {
  const { rows, bg } = useTvHomeRows();
  // 카드 id 는 "movie_123" · "tv_456" → 상세 항목
  const handleItem = (rowId, item) => {
    if (item.genre) {
      onGenre?.(item.genre);
      return;
    }
    const [type, id] = String(item.id).split("_");
    if (!id) return;
    onDetail?.({ kind: "ott", key: `ott-${item.id}`, type: type === "tv" ? "tv" : "movie", id: Number(id), title: item.title, image: item.image });
  };
  return <TvBrowseScreen menu="홈" onMenu={onMenu} rows={rows} bg={bg} onItem={handleItem} />;
};

// [추가] 장르 화면 — 장르별 모음 카드를 누르면 (웹 /browse/genre-xxx 와 같은 작품 · 영화 · 시리즈 줄)
// - 리모컨 뒤로(Esc)는 TvPreview.jsx 가 처리 (보던 홈 · 카드로)
export const TvGenre = ({ id, onMenu, onDetail }) => {
  const shelves = useShelfMap([id], true, BROWSE_LIMIT);
  const items = shelves[id];
  const rows = useMemo(() => {
    const list = items || [];
    const title = POSTER_SHELVES[id]?.title || "";
    return [
      { id: "movie", title: `${title} 영화`, items: list.filter((r) => r.media_type !== "tv").map((m) => card(m)) },
      { id: "tv", title: `${title} 시리즈`, items: list.filter((r) => r.media_type === "tv").map((m) => card(m)) },
    ].filter((r) => r.items.length > 0);
  }, [items, id]);
  const first = (items || []).find((r) => r.backdrop_path);
  const handleItem = (rowId, item) => {
    const [type, num] = String(item.id).split("_");
    if (!num) return;
    onDetail?.({ kind: "ott", key: `ott-${item.id}`, type: type === "tv" ? "tv" : "movie", id: Number(num), title: item.title, image: item.image });
  };
  return (
    <TvBrowseScreen
      menu="홈"
      onMenu={onMenu}
      rows={rows}
      bg={first ? img(first.backdrop_path, "original") : ""}
      onItem={handleItem}
      empty={items ? "작품을 불러오지 못했어요." : "콘텐츠를 불러오는 중입니다…"}
    />
  );
};

export default TvHome;
