import { create } from "zustand";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;


export const useMovieStore = create((set, get) => ({
    // 인기 영화 저장할 배열
    popMovie: [],
    // 인기영화를 불러올 메서드
    onFetchPopular: async () => {
        const res = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_KEY}&language=ko-KR`);
        console.log(res);
        const data = await res.json();
        console.log(data);
        set({ popMovie: data.results })
    }
    // 영화의 비디오를 저장할 변수
    // 영화의 비디오를 불러오는 메서드

    // 기존에 불러온 영상이 있는지를 체크해서 있으면 그만 불러오기

    // -----------티비시리즈(인기)------------
    // 인기 티비프로그램을 저장할 배열

    // 인기 티비프로그램의 영상을 저장할 오브젝트

    // 인기 티비프로그램을 불러올 메서드


    // 인기 티비프로그램 영상을 불러올 메서드


    // 시즌
    // tv 시리즈 상세 정보를 저장할 오브젝트

    // 시즌 상세 정보를 불러올 메서드

    // 시즌별 에피소드

    // 에피소드별 비디오 정보

    // 이미 저장된 비디오 데이터가 존재하는 경우 재요청 안함

    // 1. TMDB 에피소드 비디오 API 호출 (한국어)Apple TV+ 콘텐츠→ TMDB + Watch Provider 필터

    // 2. 한국어 비디오가 없으면 영어로 fallback 재요청



    // 상태 업데이트


    // 등장인물(캐스트) 정보를 저장할 오브젝트

    // 관련(비슷한) TV 프로그램을 저장할 오브젝트
}))