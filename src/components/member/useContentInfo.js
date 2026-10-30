import { useEffect, useState } from "react";

// 작품 설명 줄 · Apple Original 여부 · 소개 한 줄 (TMDB 상세 + 키워드)
// - 이어보기 · 찜 · 추천작 · AI 어시스트 카드 공용
// - 같은 작품은 한 번만 요청 (화면을 다시 그려도 재요청하지 않음)
// - Apple Original 판단: 시리즈 = 방송사 Apple TV+(2552) · 영화 = 제작사 Apple Original Films / Apple Studios
// - 설명 줄: "{대표 키워드 또는 장르} · {시리즈|영화} · {Apple Original 또는 다른 장르}"
//   예) 테드 래소 → "스포츠 · 시리즈 · Apple Original" / 파친코 → "드라마 · 시리즈 · Apple Original"
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const APPLE_TV_NETWORK = 2552;
const APPLE_MOVIE_COMPANIES = [151347, 194232]; // Apple Original Films · Apple Studios
const APPLE_NAME = /^apple( tv\+?| original films| studios)$/i;

// 장르 id → 짧은 한글 이름 (카드 한 줄에 들어가게)
const MOVIE_GENRE_SHORT = {
  28: "액션", 12: "어드벤처", 16: "애니메이션", 35: "코미디", 80: "범죄", 99: "다큐",
  18: "드라마", 10751: "가족", 14: "판타지", 36: "역사", 27: "호러", 10402: "음악",
  9648: "미스터리", 10749: "로맨스", 878: "SF", 10770: "TV 영화", 53: "스릴러", 10752: "전쟁", 37: "서부",
};
const TV_GENRE_SHORT = {
  10759: "액션", 16: "애니메이션", 35: "코미디", 80: "범죄", 99: "다큐", 18: "드라마",
  10751: "가족", 10762: "키즈", 9648: "미스터리", 10763: "뉴스", 10764: "리얼리티",
  10765: "SF", 10766: "드라마", 10767: "토크쇼", 10768: "전쟁", 37: "서부",
};

export const shortGenres = (type, ids = []) => {
  const map = type === "tv" ? TV_GENRE_SHORT : MOVIE_GENRE_SHORT;
  return [...new Set(ids.map((id) => map[id]).filter(Boolean))];
};

// 이름으로만 있는 장르(찜 목록 저장값)를 짧게: "액션 & 어드벤처" → "액션", "Sci-Fi & Fantasy" → "SF"
export const shortGenreName = (name = "") => {
  const first = name.split(/\s*[&·]\s*/)[0].trim();
  return /^sci-?fi$/i.test(first) ? "SF" : first;
};

// 키워드 → 대표 주제 (장르보다 작품을 잘 설명할 때 앞에 표시) · 위에서부터 먼저 맞는 것
const TOPICS = [
  ["스포츠", /\b(sports?|soccer|football|baseball|basketball|golf|tennis|boxing|hockey|athlete|coach|racing|race car|formula (one|1)|motorsport)\b/i],
  ["우주", /\b(outer space|space travel|space mission|space race|astronaut|spacecraft)\b/i],
  ["음악", /\b(music|musician|singer|singing|band|karaoke|concert)\b/i],
  ["실화", /\b(based on (a )?true story|biography|based on real (events|person))\b/i],
];
const topicOf = (keywords = []) => {
  const names = keywords.map((k) => k.name || "");
  const hit = TOPICS.find(([, re]) => names.some((n) => re.test(n)));
  return hit ? hit[0] : null;
};

const cache = new Map(); // "tv_123" → Promise<info>
const EMPTY = { genres: [], topic: null, original: false, tagline: "" };

const fetchInfo = (type, id) => {
  const key = `${type}_${id}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=keywords`)
        .then((res) => (res.ok ? res.json() : {}))
        .then((d) => {
          const makers = type === "tv" ? d.networks || [] : d.production_companies || [];
          const ids = type === "tv" ? [APPLE_TV_NETWORK] : APPLE_MOVIE_COMPANIES;
          const keywords = type === "tv" ? d.keywords?.results : d.keywords?.keywords;
          return {
            genres: shortGenres(type, (d.genres || []).map((g) => g.id)),
            topic: topicOf(keywords || []),
            original: makers.some((m) => ids.includes(m.id) || APPLE_NAME.test(m.name || "")),
            tagline: (d.tagline || "").trim(),
          };
        })
        .catch(() => {
          cache.delete(key); // 실패하면 다음에 다시 시도
          return EMPTY;
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

// 카드 설명 줄: "{주제 또는 장르} · {시리즈|영화} · {Apple Original 또는 다른 장르}"
// - info: useContentInfo 결과 (불러오기 전에는 null)
// - fallbackGenres: info 를 받기 전 잠깐 보여줄 장르 (목록 데이터의 장르)
export const contentMeta = (type, info, fallbackGenres = []) => {
  const genres = info?.genres?.length ? info.genres : fallbackGenres;
  const first = info?.topic || genres[0];
  const extra = info?.original ? "Apple Original" : genres.find((g) => g !== first);
  return [first, type === "tv" ? "시리즈" : "영화", extra].filter(Boolean).join(" · ");
};
