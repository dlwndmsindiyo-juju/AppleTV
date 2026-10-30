import { create } from "zustand";
import { fetchMoodRecommendations } from "./moodRecommendations.mjs";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

// 키가 없으면 개발자도구에서 바로 알 수 있게 안내 (키 없이 요청하면 401/403)
if (!TMDB_KEY) {
  console.warn("[useMovieStore] VITE_TMDB_API_KEY 가 없어 영화·TV 데이터를 불러오지 못합니다. (.env 확인)");
}

export const useMovieStore = create((set, get) => ({
  // 인기 영화 저장할 배열
  popMovie: [],
  // 인기영화를 불러올 메서드
  onFetchPopular: async () => {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_KEY}&language=ko-KR`,
    );
    console.log(res);
    const data = await res.json();
    console.log(data);
    set({ popMovie: data.results });
  },
  // 개봉 예정작을 저장할 배열
  upcoming: [],
  // 개봉 예정작을 불러올 메서드
  onFetchUpcoming: async () => {
    const { upcoming } = get();
    if (upcoming.length > 0) return;
 
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_KEY}&language=ko-KR&region=KR&page=1`,
      );
      if (!res.ok) throw new Error("개봉 예정작을 불러오지 못했습니다.");
      const data = await res.json();
      set({ upcoming: data.results || [] });
    } catch (error) {
      console.error("개봉 예정작 조회 실패:", error);
    }
  },
   // Apple 오리지널(애플 TV+ 방송사 id 2552)을 저장할 배열
  appleOriginals: [],
  // Apple 오리지널 TV 시리즈를 불러올 메서드
  onFetchAppleOriginals: async () => {
    const { appleOriginals } = get();
    if (appleOriginals.length > 0) return;
 
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&language=ko-KR&with_networks=2552&sort_by=popularity.desc&page=1`,
      );
      if (!res.ok) throw new Error("Apple 오리지널을 불러오지 못했습니다.");
      const data = await res.json();
      set({ appleOriginals: data.results || [] });
    } catch (error) {
      console.error("Apple 오리지널 조회 실패:", error);
    }
  },
  // 영화의 비디오를 저장할 변수
  popVideo: {},
  // 영화의 비디오를 불러오는 메서드
  onFetchVideo: async (id) => {
    const { popVideo } = get();
    // 이미 데이터가 존재하고 비어있지 않다면 리턴
    if (popVideo[id] && popVideo[id].length > 0) return;

    // 1. 한국어(ko-KR)로 비디오 요청
    let res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_KEY}&language=ko-KR`,
    );
    let data = await res.json();
    let videoList = data.results || [];

    // 2. 한국어 비디오가 없으면 영어(en-US)로 fallback 재요청
    if (videoList.length === 0) {
      res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_KEY}&language=en-US`,
      );
      data = await res.json();
      videoList = data.results || [];
    }

    // 3. 최종 결과 저장
    set((state) => ({
      popVideo: {
        ...state.popVideo,
        [id]: videoList,
      },
    }));
  },

  // 영화 상세 (장르·러닝타임 + 출연진 + 비슷한 영화 + 타이틀 로고) 를 저장할 오브젝트
  movieDetails: {},
  onFetchMovieDetail: async (id) => {
    const { movieDetails } = get();
    if (movieDetails[id]) return;

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits,similar,images&include_image_language=ko,en,null`,
      );
      if (!res.ok) throw new Error("영화 상세 정보를 불러오지 못했습니다.");
      const data = await res.json();
      set((state) => ({
        movieDetails: { ...state.movieDetails, [id]: data },
      }));
    } catch (error) {
      console.error("영화 상세 조회 실패:", error);
    }
  },

  // -----------티비시리즈(인기)------------
  // 인기 티비프로그램을 저장할 배열
  tvs: [],
  // 인기 티비프로그램의 영상을 저장할 오브젝트
  tvVideo: {},
  // 인기 티비프로그램을 불러올 메서드
  onFetchTv: async () => {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&language=ko-KR&page=1`,
    );
    const data = await res.json();
    console.log("인기티비", data);
    set({ tvs: data.results });
  },

  // 인기 티비프로그램 영상을 불러올 메서드
  onFetchTvVideo: async (id) => {
    const { tvVideo } = get();
    if (tvVideo[id]) return;

    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/videos?&api_key=${TMDB_KEY}&language=en-US`,
    );

    const data = await res.json();
    set((state) => ({
      tvVideo: {
        ...state.tvVideo,
        [id]: data.results,
      },
    }));
  },

  // 시즌
  // tv 시리즈 상세 정보를 저장할 오브젝트
  tvDetails: {},
  // 시즌 상세 정보를 불러올 메서드
  onFetchTvDetail: async (id) => {
    const { tvDetails } = get();
    if (tvDetails[id]) return;

    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`,
    );
    const data = await res.json();
    set((state) => ({
      tvDetails: {
        ...state.tvDetails,
        [id]: data,
      },
    }));
  },
  // 시즌별 에피소드
  episodes: {},
  onFetchEpisode: async (id, seasonNumber) => {
    const key = `${id}_${seasonNumber}`;
    const { episodes } = get();
    if (episodes[key]) return; // 시즌별로 캐싱 (기존: episodes[id] 로 확인해 다른 시즌이 안 불러와짐)

    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=ko-KR`,
    );
    const data = await res.json();

    if (!res.ok) throw new Error("시즌 정보를 불러오지 못했습니다.");

    // 중요: TMDB 시즌 에피소드 API의 결과 배열은 data.episodes 입니다.
    set((state) => ({
      episodes: {
        ...state.episodes,
        [key]: data.episodes || [],
      },
    }));
  },
  // 에피소드별 비디오 정보
  episodeVideos: {},
  onFetchEpisodeVideo: async (tvId, seasonNumber, episodeNumber) => {
    const key = `${tvId}_${seasonNumber}_${episodeNumber}`;
    const { episodeVideos } = get();

    // 이미 저장된 비디오 데이터가 존재하는 경우 재요청 안함
    if (episodeVideos[key] && episodeVideos[key].length > 0) return;

    try {
      // 1. TMDB 에피소드 비디오 API 호출 (한국어)
      // const → let: 아래 영어 fallback 에서 다시 대입하므로 (const 재할당 빌드 오류 수정)
      let res = await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=ko-KR`,
      );
      let data = await res.json();
      let videoList = data.results || [];

      // 2. 한국어 비디오가 없으면 영어로 fallback 재요청
      if (videoList.length === 0) {
        res = await fetch(
          `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=en-US`,
        );
        data = await res.json();
        videoList = data.results || [];
      }

      // 3. 상태 업데이트 (기존: 저장하는 코드가 빠져 있었음)
      set((state) => ({
        episodeVideos: {
          ...state.episodeVideos,
          [key]: videoList,
        },
      }));
    } catch (error) {
      console.error("에피소드 비디오 조회 실패:", error);
    }
  },

  // 등장인물(캐스트) 정보를 저장할 오브젝트
  tvCredits: {},
  onFetchTvCredits: async (id)=>{
    const {tvCredits} = get();
    if(tvCredits[id]) return;

    const res = await fetch (`https://api.themoviedb.org/3/tv/${id}/credits?api_key=${TMDB_KEY}&language=ko-KR`);
     const data = await res.json();

        set((state) => ({
            tvCredits: {
                ...state.tvCredits,
                [id]: data.cast || []
            }
        }));
    },
    // 관련(비슷한) TV 프로그램을 저장할 오브젝트
    tvSimilar: {},
    onFetchTvSimilar: async (id) => {
        const { tvSimilar } = get();
        if (tvSimilar[id]) return;

        const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/similar?api_key=${TMDB_KEY}&language=ko-KR&page=1`);
        const data = await res.json();

        set((state) => ({
            tvSimilar: {
                ...state.tvSimilar,
                [id]: data.results || []
            }
        }));
    },
  
  // =====================================================================
  // [추가] 로그인 후 메인 페이지용 (기존 코드는 수정하지 않음)
  // =====================================================================

  // 추천작 (이번 주 인기 TV)
  recommended: [],
  onFetchRecommended: async () => {
    const { recommended } = get();
    if (recommended.length > 0) return;

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=ko-KR`,
      );
      if (!res.ok) throw new Error("추천작을 불러오지 못했습니다.");
      const data = await res.json();
      set({ recommended: data.results || [] });
    } catch (error) {
      console.error("추천작 조회 실패:", error);
    }
  },

  // 기분별 추천 { [기분]: 작품배열 }
  moodList: {},
  onFetchMood: async (mood) => {
    const { moodList } = get();
    if (moodList[mood]) return;

    try {
      const list = await fetchMoodRecommendations(mood, { apiKey: TMDB_KEY });

      set((state) => ({
        moodList: { ...state.moodList, [mood]: list.slice(0, 10) },
      }));
    } catch (error) {
      console.error("기분별 추천 조회 실패:", error);
      throw error;
    }
  },

  // [추가] 영화 / TV 공통 상세 (ContentDetail 에서 사용)
  // - 한 번의 요청으로 상세 + 출연진 + 비슷한 작품 + 로고 이미지 + 영상(한국어·영어)까지 받음
  // - 키: "movie_123" / "tv_456"
  contentDetails: {},
  onFetchContentDetail: async (type, id) => {
    const key = `${type}_${id}`;
    if (get().contentDetails[key]) return;
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=ko-KR` +
          `&append_to_response=credits,similar,images,videos` +
          `&include_image_language=ko,en,null&include_video_language=ko,en,null`,
      );
      if (!res.ok) throw new Error(`TMDB ${type} 상세 HTTP ${res.status}`);
      const data = await res.json();
      set((state) => ({ contentDetails: { ...state.contentDetails, [key]: data } }));
    } catch (error) {
      console.error("상세 정보 조회 실패:", error);
    }
  },

  // [추가] Apple이 모두에게 추천하는 작품 — 영화 + 시리즈를 번갈아 섞은 목록 (이번 주 인기)
  // - 탑텐(Apple TV+ 오리지널)과 겹치는 작품은 RecommendSection 에서 뺌
  // - 각 작품에 media_type("movie" | "tv") 을 붙여 상세 경로 · 설명 줄에 사용
  recommendedMix: [],
  onFetchRecommendedMix: async () => {
    if (get().recommendedMix.length > 0) return;
    try {
      const [movieRes, tvRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=ko-KR`),
        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=ko-KR`),
      ]);
      if (!movieRes.ok || !tvRes.ok) throw new Error("추천 작품을 불러오지 못했습니다.");
      const movies = (await movieRes.json()).results || [];
      const tvs = (await tvRes.json()).results || [];
      const mixed = [];
      for (let i = 0; i < Math.max(movies.length, tvs.length); i += 1) {
        if (movies[i]) mixed.push({ ...movies[i], media_type: "movie" });
        if (tvs[i]) mixed.push({ ...tvs[i], media_type: "tv" });
      }
      set({ recommendedMix: mixed.filter((item) => item.poster_path) });
    } catch (error) {
      console.error("추천 작품 조회 실패:", error);
    }
  },

  // 내가 찜한 콘텐츠 (localStorage 에 유지)
  wishlist: loadLocal("wishlist"),
  onToggleWishlist: (item) => {
    const { wishlist } = get();
    const exists = wishlist.some((w) => w.id === item.id && w.type === item.type);
    const next = exists
      ? wishlist.filter((w) => !(w.id === item.id && w.type === item.type))
      : [...wishlist, item];
    saveLocal("wishlist", next);
    set({ wishlist: next });
  },

  // 공개 알림 설정 (키: "tv_123" / "movie_456")
  alarms: loadLocal("alarms"),
  onToggleAlarm: (key) => {
    const { alarms } = get();
    const next = alarms.includes(key)
      ? alarms.filter((k) => k !== key)
      : [...alarms, key];
    saveLocal("alarms", next);
    set({ alarms: next });
  },
}));


// [추가] 로그인 후 메인 페이지용 헬퍼 (function 은 호이스팅되어 위쪽 store 에서 사용 가능)
function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시 (사생활 보호 모드 등)
  }
}

