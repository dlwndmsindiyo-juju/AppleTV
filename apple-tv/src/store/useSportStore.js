import { create } from "zustand";

// Football data 키 변수로 저장
const FOOTBALL_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;

// 유튜브 API 키 환경변수
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export const useSportStore = create((set, get) => ({
    // 1. 리그 순위 데이터 저장 (Football-Data.org)
    standings: [],
    onFetchStandings: async (competition = "PL") => {
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${competition}/standings`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            set({ standings: data.standings?.[0]?.table || [] });
        } catch (error) {
            console.error("리그 순위 조회 실패:", error);
        }
    },

    // 2. 예정된 경기 일정 저장 (Football-Data.org)
    upcomingMatches: [],
    onFetchUpcomingMatches: async (competition = "PL") => {
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches?status=SCHEDULED`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            set({ upcomingMatches: data.matches || [] });
        } catch (error) {
            console.error("예정된 경기 일정 조회 실패:", error);
        }
    },

    // [추가] 진행 중인 경기 (하단 LIVE 배너용) - IN_PLAY: 경기 중 / PAUSED: 하프타임
    liveMatches: [],
    onFetchLiveMatches: async (competition = "PL") => {
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches?status=IN_PLAY,PAUSED`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            set({ liveMatches: data.matches || [] });
        } catch (error) {
            console.error("라이브 경기 조회 실패:", error);
        }
    },

    // 3. [추가] 팀별 선수 정보(스쿼드) 저장 오브젝트 (팀 ID별 캐싱)
    teamSquads: {},
    onFetchTeamSquad: async (teamId) => {
        const { teamSquads } = get();
        if (teamSquads[teamId]) return;

        try {
            const res = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            set((state) => ({
                teamSquads: {
                    ...state.teamSquads,
                    [teamId]: data // 감독(coach), 선수단(squad) 정보 등이 포함됨
                }
            }));
        } catch (error) {
            console.error("선수 정보 조회 실패:", error);
        }
    },

    // 4. 라이브 / 실시간 경기 관련 영상 (YouTube API 활용)
    liveVideos: [],
    onFetchLiveVideos: async (query = "축구 생중계 라이브") => {
        if (!YOUTUBE_KEY) return;
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&eventType=live&type=video&maxResults=5&key=${YOUTUBE_KEY}`
            );
            const data = await res.json();
            set({ liveVideos: data.items || [] });
        } catch (error) {
            console.error("라이브 영상 조회 실패:", error);
        }
    },

    // 5. 하이라이트 영상 저장 오브젝트 (경기 ID별 캐싱, 유튜브 API)
    highlights: {},
    onFetchHighlights: async (matchId, matchTitle) => {
        const { highlights } = get();
        if (highlights[matchId]) return;

        if (!YOUTUBE_KEY) return;
        try {
            const query = `${matchTitle} 하이라이트`;
            const res = await fetch(
                `https://api.themoviedb.org/...` // (참고용 주석 처리, 유튜브 API 사용)
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${YOUTUBE_KEY}`
            );
            const data = await res.json();
            set((state) => ({
                highlights: {
                    ...state.highlights,
                    [matchId]: data.items || []
                }
            }));
        } catch (error) {
            console.error("하이라이트 조회 실패:", error);
        }
    },

    // 6. 경기 다시보기 영상 저장 오브젝트 (경기 ID별 캐싱, 유튜브 API)
    fullMatches: {},
    onFetchFullMatch: async (matchId, matchTitle) => {
        const { fullMatches } = get();
        if (fullMatches[matchId]) return;

        if (!YOUTUBE_KEY) return;
        try {
            const query = `${matchTitle} 풀경기 다시보기`;
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_KEY}`
            );
            const data = await res.json();
            set((state) => ({
                fullMatches: {
                    ...state.fullMatches,
                    [matchId]: data.items || []
                }
            }));
        } catch (error) {
            console.error("경기 다시보기 조회 실패:", error);
        }
    },

    // [추가] 종료된 경기 (영상 다시보기용) - 최근 경기 순
    finishedMatches: [],
    onFetchFinishedMatches: async (competition = "PL") => {
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            const list = (data.matches || [])
                .slice()
                .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
            set({ finishedMatches: list });
        } catch (error) {
            console.error("종료된 경기 조회 실패:", error);
        }
    },

    // [추가] 하이라이트 영상 목록 (홈 "하이라이트" 섹션용, 검색 1회로 4개)
    highlightList: [],
    onFetchHighlightList: async (query = "축구 경기 하이라이트") => {
        const { highlightList } = get();
        if (highlightList.length > 0) return;
        if (!YOUTUBE_KEY) return;
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${YOUTUBE_KEY}`
            );
            const data = await res.json();
            set({ highlightList: data.items || [] });
        } catch (error) {
            console.error("하이라이트 목록 조회 실패:", error);
        }
    },

    // 7. 숏츠 영상 저장 (축구 쇼츠/릴스 형태, 유튜브 API)
    shortsVideos: [],
    onFetchShorts: async (query = "축구 명장면 shorts") => {
        if (!YOUTUBE_KEY) return;
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&videoDuration=short&type=video&maxResults=10&key=${YOUTUBE_KEY}`
            );
            const data = await res.json();
            set({ shortsVideos: data.items || [] });
        } catch (error) {
            console.error("숏츠 영상 조회 실패:", error);
        }
    },
}));