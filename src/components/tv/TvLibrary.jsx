import React, { useEffect, useMemo } from "react";
import { useHeartStore } from "../../store/useHeartStore";
import { useMovieStore } from "../../store/useMovieStore";
import { useAuthStore } from "../../store/useAuthStore";
import { TMDB_IMG } from "../../utils/tmdb";
import { TV_SPORT_BG } from "../../data/tvSportData";
import { TvBrowseScreen } from "./TvRows";
import { readInterest } from "./TvActions";

// [추가] TV 보관함 — 위 메뉴 "보관함" · 왼쪽 메뉴 "보관함" · 스타일: TV 홈 · 스포츠와 같은 줄 (TvRows · TV.scss)
// - 내 위시리스트(웹과 같은 목록) + 관심 경기(상세 · 영상 끝 화면의 "관심 경기")
// - 섹션: 영화 · 시리즈 · 애니메이션 · 오리지널스 · 스포츠 (담은 게 없는 섹션은 숨김)
//   · 한 작품은 한 섹션에만: 오리지널스(Apple TV+) → 애니메이션(장르) → 영화 / 시리즈
// - 카드를 누르면 상세 페이지 (TvDetail)

const imageOf = (w) =>
  w.backdrop_path ? `${TMDB_IMG}/w780${w.backdrop_path}` : w.poster_path ? `${TMDB_IMG}/w780${w.poster_path}` : "";

const sectionOf = (w, originalIds) => {
  if (w.type === "tv" && originalIds.has(w.id)) return "originals";
  if ((w.genres || []).some((g) => String(g).includes("애니메이션"))) return "animation";
  return w.type === "tv" ? "series" : "movie";
};

const SECTIONS = [
  { id: "movie", title: "영화" },
  { id: "series", title: "시리즈" },
  { id: "animation", title: "애니메이션" },
  { id: "originals", title: "오리지널스" },
  { id: "sport", title: "스포츠" },
];

// onDetail(item): 상세 페이지 열기
export const TvLibrary = ({ onMenu, onDetail }) => {
  const items = useHeartStore((s) => s.items);
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const fetchOriginals = useMovieStore((s) => s.onFetchAppleOriginals);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchOriginals();
  }, [fetchOriginals]);

  const rows = useMemo(() => {
    const originalIds = new Set((appleOriginals || []).map((t) => t.id));
    const groups = { movie: [], series: [], animation: [], originals: [], sport: [] };

    Object.values(items || {})
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .forEach((w) => {
        const type = w.type === "tv" ? "tv" : "movie";
        groups[sectionOf(w, originalIds)].push({
          id: `${type}_${w.id}`,
          title: w.title,
          image: imageOf(w),
          detail: { kind: "ott", key: `ott-${type}-${w.id}`, type, id: w.id, title: w.title, image: imageOf(w) },
        });
      });

    // 스포츠: 관심 경기 (이 기기에 저장 · 최근에 담은 순)
    readInterest()
      .filter((v) => v && typeof v === "object" && v.title)
      .reverse()
      .forEach((v) => {
        groups.sport.push({
          id: `sport_${v.id}`,
          title: v.title,
          image: v.image,
          detail: { kind: "sport", key: `video-${v.id}`, videoId: v.videoId || null, title: v.title, image: v.image, label: v.label, prefix: v.prefix, desc: v.desc },
        });
      });

    return SECTIONS.map((s) => ({ id: s.id, title: s.title, items: groups[s.id] })).filter((r) => r.items.length > 0);
  }, [items, appleOriginals]);

  const empty = user
    ? "보관함이 비어 있어요. 작품 상세에서 '관심 콘텐츠', 경기 상세에서 '관심 경기' 를 눌러 담아 보세요."
    : "로그인하면 위시리스트에 담은 작품이 보관함에 보여요.";

  return (
    <TvBrowseScreen
      menu="보관함"
      onMenu={onMenu}
      rows={rows}
      bg={TV_SPORT_BG}
      empty={empty}
      onItem={(rowId, item) => item.detail && onDetail?.(item.detail)}
    />
  );
};

export default TvLibrary;
