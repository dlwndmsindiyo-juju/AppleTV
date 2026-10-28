// src/store/useSearchStore.js
// 검색하기 플로우 데이터 (시안: 검색 결과 · 인물 · 작품 페이지)
// - TMDB 검색: 영화 / 시리즈 / 인물을 동시에 요청 (검색 결과: 인기 검색 결과 3 · TV 프로그램 · 영화)
// - 최근 검색 항목: 검색 결과에서 누른 작품 · 인물 (이 브라우저 · 계정별 localStorage)
// - 대한민국 이용 방법: 작품마다 TMDB watch/providers(KR) 로 판단 → 한 번 받은 값은 저장해서 재사용
//     구독(flatrate)에 Apple TV+ 있음   → "subscription" (구독으로 시청 · 웹)
//     대여·구매(rent/buy)에 Apple TV 있음 → "rent"         (대여·구매 · Apple TV 앱)
//     둘 다 없음                          → "none"         (대한민국에서 이용 불가)
// - 관심 인물: Firestore users/{uid}.favoritePeople (인물 id 배열)
import { create } from "zustand";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useAuthStore } from "./useAuthStore";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API = "https://api.themoviedb.org/3";

export const IMG = "https://image.tmdb.org/t/p";

// TMDB 제공사 id (watch/providers)
const APPLE_TV_PLUS = [350, 2243]; // Apple TV+ · Apple TV+ (채널)
const APPLE_TV_STORE = [2]; // Apple TV (대여 · 구매)

// 이용 방법 → 화면 문구 (카드 · 작품 페이지 공용)
export const AVAILABILITY = {
  subscription: {
    card: "구독으로 시청 · 웹",
    status: "대한민국에서 시청 가능",
    detail: "Apple TV 구독에 포함 · 이 웹사이트에서 시청",
  },
  rent: {
    card: "대여·구매 · Apple TV 앱",
    status: "대한민국에서 대여·구매 가능",
    detail: "Apple TV 앱에서 이용 · 구독에 포함되지 않음",
  },
  none: {
    card: "대한민국에서 이용 불가",
    status: "대한민국에서 현재 이용할 수 없습니다.",
    detail: "이 작품은 대한민국에 제공되지 않아 시청할 수 없습니다.",
  },
};

// 작품 key: "movie_123" / "tv_456"
export const itemKey = (type, id) => `${type}_${id}`;

// TMDB 요청 (한국어 기본)
const tmdb = async (path, params = {}) => {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "ko-KR");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path} ${res.status}`);
  return res.json();
};

// watch/providers 결과(KR) → 이용 방법
export const availabilityFromProviders = (providers) => {
  const kr = providers?.results?.KR;
  if (!kr) return "none";
  const has = (list, ids) => (list || []).some((p) => ids.includes(p.provider_id));
  if (has(kr.flatrate, APPLE_TV_PLUS)) return "subscription";
  if (has(kr.rent, APPLE_TV_STORE) || has(kr.buy, APPLE_TV_STORE)) return "rent";
  return "none";
};

// 동시에 너무 많이 요청하지 않도록 (한 번에 6개씩)
const runLimited = async (tasks, limit = 6) => {
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const task = tasks[i++];
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
};

const emptyResults = () => ({
  movie: [],
  tv: [],
  person: [],
});

// ---------- 최근 검색 항목 (localStorage · 계정별 · 최대 3개) ----------
const RECENT_MAX = 3;
const recentKey = (uid) => `recentSearches:${uid || "guest"}`;
const readRecent = (uid) => {
  try {
    const list = JSON.parse(localStorage.getItem(recentKey(uid)) || "[]");
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};
const writeRecent = (uid, list) => {
  try {
    localStorage.setItem(recentKey(uid), JSON.stringify(list));
  } catch {
    // 저장할 수 없는 환경이면 이번 방문 동안만 유지
  }
};

let searchToken = 0; // 빠르게 바뀐 이전 검색 결과는 버림

export const useSearchStore = create((set, get) => ({
  // ---------- 장르 이름 (id → 한글) ----------
  genres: { movie: {}, tv: {} },
  genresLoaded: false,
  onLoadGenres: async () => {
    if (get().genresLoaded) return;
    try {
      const [m, t] = await Promise.all([tmdb("/genre/movie/list"), tmdb("/genre/tv/list")]);
      const toMap = (list) => Object.fromEntries((list.genres || []).map((g) => [g.id, g.name]));
      set({ genres: { movie: toMap(m), tv: toMap(t) }, genresLoaded: true });
    } catch (error) {
      console.error("장르 목록 조회 실패:", error);
    }
  },

  // ---------- 둘러보기 (검색 전): 오늘의 인기 영화 · 시리즈 포스터 ----------
  trending: [],
  onLoadTrending: async () => {
    if (get().trending.length) return;
    try {
      const [p1, p2] = await Promise.all([
        tmdb("/trending/all/day"),
        tmdb("/trending/all/day", { page: 2 }),
      ]);
      const list = [...(p1.results || []), ...(p2.results || [])].filter(
        (r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
      );
      set({ trending: list });
    } catch (error) {
      console.error("인기 작품 조회 실패:", error);
    }
  },

  // ---------- 최근 검색 항목 ----------
  // 항목: { type: "movie" | "tv" | "person", id, title, sub, image }
  recent: [],
  recentUid: null,
  onLoadRecent: (uid) => set({ recent: readRecent(uid), recentUid: uid }),
  onAddRecent: (entry) => {
    const { recent, recentUid } = get();
    const next = [entry, ...recent.filter((r) => !(r.type === entry.type && r.id === entry.id))].slice(
      0,
      RECENT_MAX
    );
    writeRecent(recentUid, next);
    set({ recent: next });
  },
  onClearRecent: () => {
    writeRecent(get().recentUid, []);
    set({ recent: [] });
  },

  // ---------- 검색 ----------
  query: "",
  status: "idle", // idle | loading | done | error
  results: emptyResults(),

  onSearch: async (rawQuery) => {
    const query = rawQuery.trim();
    const token = ++searchToken;
    if (!query) {
      set({ query: "", status: "idle", results: emptyResults() });
      return;
    }
    set({ query, status: "loading" });

    try {
      await get().onLoadGenres();
      const { genres } = get();

      // 장르 이름으로 검색했으면 (예: "SF", "코미디") 그 장르 작품으로 영화 · 시리즈를 채움
      const findGenre = (map) =>
        Object.entries(map).find(([, name]) => name.replace(/\s/g, "") === query.replace(/\s/g, ""))?.[0];
      const genreMovie = findGenre(genres.movie);
      const genreTv = findGenre(genres.tv);

      const common = { query, include_adult: "false", page: 1 };
      const [movie, tv, person] = await Promise.all([
        genreMovie
          ? tmdb("/discover/movie", { with_genres: genreMovie, sort_by: "popularity.desc", page: 1 })
          : tmdb("/search/movie", common),
        genreTv
          ? tmdb("/discover/tv", { with_genres: genreTv, sort_by: "popularity.desc", page: 1 })
          : tmdb("/search/tv", common),
        tmdb("/search/person", common),
      ]);
      if (token !== searchToken) return;

      const withType = (list, type) => (list || []).map((r) => ({ ...r, media_type: type }));
      set({
        status: "done",
        results: {
          movie: withType(movie.results, "movie"),
          tv: withType(tv.results, "tv"),
          person: person.results || [],
        },
      });
    } catch (error) {
      console.error("검색 실패:", error);
      if (token === searchToken) set({ status: "error" });
    }
  },

  // ---------- 대한민국 이용 방법 ----------
  availability: {}, // { "movie_1": "subscription" | "rent" | "none" | "loading" }
  onLoadAvailability: async (items) => {
    const { availability } = get();
    const todo = (items || [])
      .filter((it) => it && (it.media_type === "movie" || it.media_type === "tv"))
      .map((it) => ({ type: it.media_type, id: it.id }))
      .filter(({ type, id }) => !availability[itemKey(type, id)]);
    if (!todo.length) return;

    // 요청 중 표시 (중복 요청 방지)
    set((state) => ({
      availability: {
        ...state.availability,
        ...Object.fromEntries(todo.map(({ type, id }) => [itemKey(type, id), "loading"])),
      },
    }));

    await runLimited(
      todo.map(({ type, id }) => async () => {
        let value = "none";
        try {
          value = availabilityFromProviders(await tmdb(`/${type}/${id}/watch/providers`));
        } catch {
          value = "none";
        }
        set((state) => ({ availability: { ...state.availability, [itemKey(type, id)]: value } }));
      })
    );
  },

  // ---------- 인물 ----------
  people: {}, // { [id]: { info, nameEn, credits, status } }
  onLoadPerson: async (id) => {
    const cached = get().people[id];
    if (cached && cached.status !== "error") return;
    set((state) => ({ people: { ...state.people, [id]: { status: "loading" } } }));
    try {
      const [info, en, credits] = await Promise.all([
        tmdb(`/person/${id}`),
        tmdb(`/person/${id}`, { language: "en-US" }),
        tmdb(`/person/${id}/combined_credits`),
      ]);
      set((state) => ({
        people: {
          ...state.people,
          [id]: { status: "done", info, nameEn: en.name, bioEn: en.biography, credits },
        },
      }));
    } catch (error) {
      console.error("인물 정보 조회 실패:", error);
      set((state) => ({ people: { ...state.people, [id]: { status: "error" } } }));
    }
  },

  // ---------- 작품 ----------
  titles: {}, // { "movie_1": { status, detail } }
  onLoadTitle: async (type, id) => {
    const key = itemKey(type, id);
    const cached = get().titles[key];
    if (cached && cached.status !== "error") return;
    set((state) => ({ titles: { ...state.titles, [key]: { status: "loading" } } }));
    try {
      const detail = await tmdb(`/${type}/${id}`, {
        append_to_response: "videos,recommendations,similar,watch/providers",
        include_video_language: "ko,en,null",
      });
      set((state) => ({
        titles: { ...state.titles, [key]: { status: "done", detail } },
        // 작품 페이지에서 받은 이용 방법도 함께 저장 (카드와 같은 값)
        availability: {
          ...state.availability,
          [key]: availabilityFromProviders(detail["watch/providers"]),
        },
      }));
    } catch (error) {
      console.error("작품 정보 조회 실패:", error);
      set((state) => ({ titles: { ...state.titles, [key]: { status: "error" } } }));
    }
  },

  // ---------- 관심 인물 (Firestore 계정) ----------
  // users/{uid}.favoritePeople = [인물 id, ...]
  onToggleFavoritePerson: async (personId) => {
    const fbUser = auth.currentUser;
    const user = useAuthStore.getState().user;
    if (!fbUser || !user) return false;

    const list = user.favoritePeople || [];
    const following = list.includes(personId);
    const next = following ? list.filter((v) => v !== personId) : [...list, personId];

    // 화면 먼저 바꾸고 저장 (실패하면 되돌림)
    useAuthStore.setState({ user: { ...user, favoritePeople: next } });
    try {
      await updateDoc(doc(db, "users", fbUser.uid), {
        favoritePeople: following ? arrayRemove(personId) : arrayUnion(personId),
      });
      return true;
    } catch (error) {
      console.error("관심 인물 저장 실패:", error);
      useAuthStore.setState({ user: { ...useAuthStore.getState().user, favoritePeople: list } });
      return false;
    }
  },
}));
