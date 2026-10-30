import { useEffect, useState } from "react";

// 작품 장르 · Apple Original 여부 (TMDB 상세) — 이어보기 · 찜 카드 설명 줄용
// - 같은 작품은 한 번만 요청 (화면을 다시 그려도 재요청하지 않음)
// - Apple Original 판단: 시리즈 = 방송사 Apple TV+(2552) · 영화 = 제작사 Apple Original Films / Apple Studios
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const APPLE_TV_NETWORK = 2552;
const APPLE_MOVIE_COMPANIES = [151347, 194232]; // Apple Original Films · Apple Studios
const APPLE_NAME = /^apple( tv\+?| original films| studios)$/i;

const cache = new Map(); // "tv_123" → Promise<{ genres, original }>

const fetchInfo = (type, id) => {
  const key = `${type}_${id}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=ko-KR`)
        .then((res) => (res.ok ? res.json() : {}))
        .then((d) => {
          const makers = type === "tv" ? d.networks || [] : d.production_companies || [];
          const ids = type === "tv" ? [APPLE_TV_NETWORK] : APPLE_MOVIE_COMPANIES;
          return {
            genres: (d.genres || []).map((g) => g.name),
            original: makers.some((m) => ids.includes(m.id) || APPLE_NAME.test(m.name || "")),
          };
        })
        .catch(() => {
          cache.delete(key); // 실패하면 다음에 다시 시도
          return { genres: [], original: false };
        })
    );
  }
  return cache.get(key);
};

export const useContentInfo = (type, id) => {
  const key = `${type}_${id}`;
  const [info, setInfo] = useState({ key: null, value: null });

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    fetchInfo(type === "tv" ? "tv" : "movie", id).then((value) => {
      if (alive) setInfo({ key, value });
    });
    return () => {
      alive = false;
    };
  }, [type, id, key]);

  return info.key === key ? info.value : null;
};

// 카드 설명 줄: "영화 · 액션 · Apple Original" / "시리즈 · 액션 · 스릴러"
// - 실제 Apple Original 작품만 마지막에 "Apple Original" 표시
export const contentMeta = (type, genres = [], original = false) =>
  [type === "tv" ? "시리즈" : "영화", genres[0], original ? "Apple Original" : genres[1]]
    .filter(Boolean)
    .join(" · ");
