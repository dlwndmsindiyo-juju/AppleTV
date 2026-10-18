import { create } from "zustand";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

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
    if (episodes[id]) return;

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
  onFetchEpisodeVideo: async (
    tvId,
    seasonNumber,
    episodeNumber,
    tvTitle = "",
  ) => {
    const key = `${tvId}_${seasonNumber}_${episodeNumber}`;
    const { episodeVideos } = get();

    // 이미 저장된 비디오 데이터가 존재하는 경우 재요청 안함
    if (episodeVideos[key] && episodeVideos[key].length > 0) return;

    try {
      // 1. TMDB 에피소드 비디오 API 호출 (한국어)Apple TV+ 콘텐츠→ TMDB + Watch Provider 필터
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=ko-KR`,
      );
      const data = await res.json();
      const videoList = data.results || [];

      // 2. 한국어 비디오가 없으면 영어로 fallback 재요청
      if (videoList.length === 0) {
        res = await fetch(
          `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=en-US`,
        );
        data = await res.json();
        videoList = data.results || [];
      }

      // 3. TMDB에 영상이 여전히 없는 경우 -> 유튜브 데이터로 직접검색
      // 상태 업데이트
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
  
}));
