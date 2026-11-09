// src/components/member/posterShelfData.js
// [추가] 섹션 데이터 불러오기 (data/posterShelves.js 의 sources → TMDB)
// - 같은 섹션 · 같은 개수는 한 번만 요청 (탭을 닫기 전까지 그대로 사용)
// - 포스터가 없는 작품 · 성인물은 빼고, 영화와 시리즈가 섞이면 번갈아 놓음
// - loadShelf(id, limit): 홈은 섹션의 limit, 전체 보기는 BROWSE_LIMIT (TMDB 여러 쪽)
import { POSTER_SHELVES } from "../../data/posterShelves";

const API = "https://api.themoviedb.org/3";
const KEY = import.meta.env.VITE_TMDB_API_KEY;
const cache = new Map(); // "id:limit" → Promise<items>

// Apple TV+ 만: 영화는 제공 서비스(350 · 한국), 시리즈는 방송사(2552)
const appleParams = (type) =>
  type === "tv" ? { with_networks: 2552 } : { with_watch_providers: 350, watch_region: "KR" };

const request = async (path, params, page = 1) => {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("api_key", KEY);
  url.searchParams.set("language", "ko-KR");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", String(page));
  if (path.startsWith("/discover")) url.searchParams.set("sort_by", "popularity.desc");
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  return data.results || [];
};

// 필요한 개수만큼 여러 쪽 (한 쪽 20개)
const requestMany = async (path, params, type, want) => {
  const pages = Math.max(1, Math.ceil(want / 20));
  const lists = await Promise.all(Array.from({ length: pages }, (_, i) => request(path, params, i + 1)));
  return lists.flat().filter((r) => r.poster_path && !r.adult).map((r) => ({ ...r, media_type: type }));
};

// 여러 목록을 번갈아 섞기 (영화 · 시리즈 · 영화 · 시리즈 …) · 같은 작품은 한 번만
const interleave = (lists, limit) => {
  const out = [];
  const seen = new Set();
  for (let i = 0; out.length < limit && lists.some((l) => i < l.length); i += 1) {
    lists.forEach((l) => {
      const r = l[i];
      const key = r && `${r.media_type}_${r.id}`;
      if (r && !seen.has(key) && out.length < limit) {
        seen.add(key);
        out.push(r);
      }
    });
  }
  return out;
};

const loadSource = async (src, want) => {
  if (!src.apple) return requestMany(src.path, src.params, src.type, want);
  const apple = await requestMany(src.path, { ...src.params, ...appleParams(src.type) }, src.type, want);
  if (apple.length >= Math.min(want, 10)) return apple;
  // Apple TV+ 작품이 모자라면 같은 조건의 다른 작품으로 채움 (Apple TV+ 작품이 앞)
  const rest = (await requestMany(src.path, src.params, src.type, want)).filter((r) => !apple.some((a) => a.id === r.id));
  return [...apple, ...rest];
};

export const loadShelf = (id, limit) => {
  const shelf = POSTER_SHELVES[id];
  if (!KEY || !shelf) return Promise.resolve([]);
  const want = limit || shelf.limit || 20;
  const key = `${id}:${want}`;
  if (!cache.has(key)) {
    const each = Math.ceil(want / shelf.sources.length); // 섞을 목록마다 필요한 개수
    const p = Promise.all(shelf.sources.map((src) => loadSource(src, Math.max(each, 20))))
      .then((lists) => interleave(lists, want))
      .catch((err) => {
        cache.delete(key); // 실패하면 다음에 다시 시도
        throw err;
      });
    cache.set(key, p);
  }
  return cache.get(key);
};
