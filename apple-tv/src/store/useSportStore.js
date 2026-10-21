import { create } from "zustand";
import { isLiveFootballVideo } from "../components/sport/liveFootball";

// Football data 키 변수로 저장
const FOOTBALL_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;

// 유튜브 API 키 환경변수
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// TheSportsDB 프리미엄 키 (.env 의 VITE_SPORTS_API_KEY)
// VITE_SPORTSDB_BASE 는 CORS 때문에 Vite 프록시("/sportsdb")를 쓸 때만 지정합니다.
const SPORTSDB_KEY = import.meta.env.VITE_SPORTS_API_KEY;
const SPORTSDB_BASE = import.meta.env.VITE_SPORTSDB_BASE || "https://www.thesportsdb.com";

// ───────── YouTube 공통 헬퍼 ─────────
// search.list 는 호출당 100유닛(일 한도 10,000)이라 localStorage 에 6시간 캐싱합니다.
const CACHE_TTL = 6 * 60 * 60 * 1000;

const readCache = (key, ttl = CACHE_TTL) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { t, data } = JSON.parse(raw);
        return { data, fresh: Date.now() - t < ttl };
    } catch { return null; }
};

const writeCache = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* 용량 초과 무시 */ }
};

// 응답 코드와 error 필드를 확인하는 YouTube 호출 (쿼터 초과 시 403)
const youtubeGet = async (path, params) => {
    const qs = new URLSearchParams({ ...params, key: YOUTUBE_KEY });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `YouTube ${path} HTTP ${res.status}`);
    return data;
};

// 캐시가 신선하면 그대로, 아니면 loader 실행. 실패하면 오래된 캐시라도 사용
const withCache = async (key, loader, ttl = CACHE_TTL) => {
    const cached = readCache(key, ttl);
    if (cached?.fresh) return cached.data;
    try {
        const data = await loader();
        if (!(Array.isArray(data) && data.length === 0)) writeCache(key, data); // 빈 결과는 캐싱하지 않음
        return data;
    } catch (error) {
        if (cached) return cached.data;
        throw error;
    }
};

// ISO8601 길이(PT1M5S) → 초
const durationToSeconds = (iso = "") => {
    const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!m) return Infinity;
    return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

// 초 → "m:ss" / "h:mm:ss" (LIVE 카드 시간 배지용, 값이 없으면 빈 문자열)
const formatDuration = (sec) => {
    if (!Number.isFinite(sec) || sec <= 0) return "";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = String(sec % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

// ───────── TheSportsDB 헬퍼 ─────────
// MLS 리그 ID (lookupleague.php?id=4346 으로 MLS 가 맞는지 한 번 확인해 주세요)
const SPORTSDB_MLS_ID = "4346";
// V1: 키가 URL 경로 / V2: X-API-KEY 헤더 (헤더가 있어 브라우저에서 CORS 사전 요청이 발생)
const sportsDbV1 = async (path) => {
    const res = await fetch(`${SPORTSDB_BASE}/api/v1/json/${SPORTSDB_KEY}/${path}`);
    if (!res.ok) throw new Error(`TheSportsDB v1 HTTP ${res.status}`);
    return res.json();
};

const sportsDbV2 = async (path) => {
    const res = await fetch(`${SPORTSDB_BASE}/api/v2/json/${path}`, {
        headers: { "X-API-KEY": SPORTSDB_KEY },
    });
    if (!res.ok) throw new Error(`TheSportsDB v2 HTTP ${res.status}`);
    return res.json();
};

// strVideo(YouTube 주소) → videoId
const youtubeIdFromUrl = (url = "") => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
};

// TheSportsDB 하이라이트를 기존 컴포넌트가 쓰는 YouTube 검색 결과 모양으로 변환
// → SportLive / SportHighlights 는 수정 없이 그대로 동작합니다.
// lookuptable 한 줄 → football-data 순위 행 모양 (SportConferenceStandings 가 그대로 사용)
const toStandingRow = (r) => ({
    position: Number(r.intRank) || 0,
    team: { id: r.idTeam, name: r.strTeam, shortName: r.strTeam, crest: r.strBadge },
    playedGames: Number(r.intPlayed),
    won: Number(r.intWin),
    draw: Number(r.intDraw),
    lost: Number(r.intLoss),
    points: Number(r.intPoints),
});

const normalizeSportsDbHighlight = (item) => {
    const videoId = youtubeIdFromUrl(item?.strVideo);
    if (!videoId) return null;
    const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    return {
        id: { videoId },
        source: "thesportsdb",
        // 경기 다시보기 카드에서 쓰는 경기 정보 (응답에 없는 값은 null)
        event: {
            id: item.idEvent || videoId,
            home: item.strHomeTeam || null,
            away: item.strAwayTeam || null,
            homeScore: num(item.intHomeScore),
            awayScore: num(item.intAwayScore),
            homeBadge: item.strHomeTeamBadge || null,
            awayBadge: item.strAwayTeamBadge || null,
            date: item.dateEvent || null,
        },
        snippet: {
            title: item.strEvent || [item.strHomeTeam, item.strAwayTeam].filter(Boolean).join(" vs "),
            channelTitle: item.strLeague || "",
            thumbnails: { high: { url: item.strThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } },
        },
    };
};

// 히어로에 먼저 보여줄 리그 순서 (리그 확정 후 수정)
const LEAGUE_PRIORITY = [
    "American Major League Soccer", "English Premier League", "UEFA Champions League",
    "Spanish La Liga", "German Bundesliga", "Italian Serie A", "French Ligue 1",
];
const LEAGUE_LABELS = {
    "American Major League Soccer": "MLS",
    "English Premier League": "프리미어리그",
    "UEFA Champions League": "챔피언스리그",
    "Spanish La Liga": "라리가",
    "German Bundesliga": "분데스리가",
    "Italian Serie A": "세리에 A",
    "French Ligue 1": "리그 1",
};

// livescore 한 줄 → football-data 경기 모양 (SportHero / isLive 가 그대로 사용)
const toLiveMatch = (row) => {
    const status = String(row?.strStatus || "").toUpperCase();
    if (/^(NS|FT|AET|PEN|AP|PST|CANC|ABD|AWD|TBD)$/.test(status)) return null; // 진행 중이 아닌 경기
    const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    return {
        id: row.idEvent || row.idLiveScore,
        status: status === "HT" ? "PAUSED" : "IN_PLAY",
        minute: parseInt(row.strProgress, 10) || null,
        competition: { name: LEAGUE_LABELS[row.strLeague] || row.strLeague },
        homeTeam: { name: row.strHomeTeam, shortName: row.strHomeTeam, crest: row.strHomeTeamBadge },
        awayTeam: { name: row.strAwayTeam, shortName: row.strAwayTeam, crest: row.strAwayTeamBadge },
        score: { fullTime: { home: num(row.intHomeScore), away: num(row.intAwayScore) } },
        _league: row.strLeague,
    };
};

// 홈 "하이라이트" 4칸 고정 카테고리 (시안 라벨)
export const HIGHLIGHT_CATEGORIES = [
    { key: "match", label: "경기 하이라이트", query: "축구 경기 하이라이트" },
    { key: "goal", label: "오늘의 골", query: "축구 오늘의 골 모음" },
    { key: "interview", label: "선수 인터뷰", query: "축구 선수 인터뷰" },
    { key: "best", label: "이번 주 베스트", query: "축구 이번 주 베스트 장면" },
];

export const useSportStore = create((set, get) => ({
    // 1. 리그 순위 데이터 저장 (Football-Data.org)
    standings: [],
    standingsGroups: [],
    onFetchStandings: async (competition = "PL") => {
        // 1) TheSportsDB MLS 순위 (프리미엄 V1 lookuptable, 30분 캐시). 성공하면 football-data 호출은 생략
        if (SPORTSDB_KEY) {
            try {
                const rows = await withCache("sport-sdb-table", async () => {
                    const data = await sportsDbV1(`lookuptable.php?l=${SPORTSDB_MLS_ID}`);
                    if (import.meta.env.DEV) console.info("[TheSportsDB lookuptable]", data);
                    return (data.table || []).map(toStandingRow).filter((r) => r.team.name);
                }, 30 * 60 * 1000);
                if (rows.length > 0) { set({ standings: rows, standingsGroups: [] }); return; }
            } catch (error) {
                console.error("TheSportsDB 순위 조회 실패 (football-data 로 대체):", error);
            }
        }
        // 2) football-data (무료 플랜에는 MLS 가 없어 PL 등 유럽 리그만 가능)
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${competition}/standings`, {
                headers: { 'X-Auth-Token': FOOTBALL_KEY }
            });
            const data = await res.json();
            set({ standings: data.standings?.[0]?.table || [], standingsGroups: data.standings || [] });
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
        // 1) TheSportsDB 프리미엄 livescore (V2, 약 2분 간격 갱신). 진행 중 경기가 있으면 이걸 사용
        if (SPORTSDB_KEY) {
            try {
                const data = await sportsDbV2("livescore/Soccer");
                const rows = data.livescore || data.livescores || data.events || [];
                const live = rows.map(toLiveMatch).filter(Boolean).sort((a, b) => {
                    const pa = LEAGUE_PRIORITY.indexOf(a._league), pb = LEAGUE_PRIORITY.indexOf(b._league);
                    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
                });
                if (live.length > 0) { set({ liveMatches: live }); return; }
            } catch (error) {
                console.error("TheSportsDB 라이브스코어 조회 실패 (football-data 로 대체):", error);
            }
        }
        // 2) football-data (무료 플랜은 지연/제한이 있음)
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

    // 4. 현재 진행 중인 실제 축구 경기 중계만 노출합니다.
    liveVideos: [],
    onFetchLiveVideos: async () => {
        if (!YOUTUBE_KEY) return;
        try {
            const search = new URLSearchParams({
                part: "snippet", q: "축구 경기 생중계|soccer match live",
                eventType: "live", type: "video", videoCategoryId: "17",
                topicId: "/m/02vx4", maxResults: "25", key: YOUTUBE_KEY,
            });
            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${search}`);
            if (!res.ok) throw new Error(`YouTube search HTTP ${res.status}`);
            const data = await res.json();
            const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean);
            if (!ids.length) { set({ liveVideos: [] }); return; }

            const params = new URLSearchParams({
                part: "snippet,topicDetails,liveStreamingDetails", id: ids.join(","), key: YOUTUBE_KEY,
            });
            const details = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
            if (!details.ok) throw new Error(`YouTube videos HTTP ${details.status}`);
            const videos = await details.json();
            set({ liveVideos: (videos.items || [])
                .map((video) => ({ ...video, id: { videoId: video.id } }))
                .filter(isLiveFootballVideo) });
        } catch (error) {
            set({ liveVideos: [] });
            console.error("축구 라이브 경기 조회 실패:", error);
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
        if (get().finishedMatches.length > 0) return;
        if (!FOOTBALL_KEY) return; // 키 없이 요청하면 403 → SportReplay 가 TheSportsDB 영상으로 대체
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

    // [추가] TheSportsDB 최신 경기 하이라이트 풀 (프리미엄 V1 eventshighlights, 1시간 캐시)
    sportsDbHighlights: [],
    onFetchSportsDbHighlights: async () => {
        const loaded = get().sportsDbHighlights;
        if (loaded.length > 0) return loaded;
        if (!SPORTSDB_KEY) return [];
        try {
            const pool = await withCache("sport-sdb-highlights", async () => {
                const data = await sportsDbV1("eventshighlights.php?s=Soccer");
                const rows = data.tvhighlights || data.highlights || data.events || [];
                const seen = new Set();
                return rows.map(normalizeSportsDbHighlight)
                    .filter((v) => v && !seen.has(v.id.videoId) && seen.add(v.id.videoId));
            }, 60 * 60 * 1000);
            set({ sportsDbHighlights: pool });
            return pool;
        } catch (error) {
            console.error("TheSportsDB 하이라이트 조회 실패 (YouTube 로 대체):", error);
            return [];
        }
    },

    // [추가] 가짜 LIVE 카드용 영상 목록 — TheSportsDB 최신 경기 하이라이트(eventshighlights) 전용
    // - 영상 길이 배지: YouTube 키가 있으면 videos API(1유닛, 검색 아님)로 길이만 조회, 없으면 배지 생략
    highlightList: [],
    onFetchHighlightList: async () => {
        if (get().highlightList.length > 0) return;

        const pool = await get().onFetchSportsDbHighlights();
        if (pool.length === 0) return;

        const picks = pool.slice(0, 6);
        let seconds = {};
        if (YOUTUBE_KEY) {
            try {
                seconds = await withCache(`sport-sdb-durations:${picks.map((v) => v.id.videoId).join(",")}`, async () => {
                    const details = await youtubeGet("videos", { part: "contentDetails", id: picks.map((v) => v.id.videoId).join(",") });
                    return Object.fromEntries((details.items || []).map((v) => [v.id, durationToSeconds(v.contentDetails?.duration)]));
                });
            } catch { /* 길이 배지만 생략 */ }
        }
        set({ highlightList: picks.map((v) => ({ ...v, durationText: formatDuration(seconds[v.id.videoId]) })) });
    },

    // [추가] 홈 "하이라이트" 섹션: 시안의 고정 카테고리 4개 × 영상 1개
    // - latestMatch(football-data 최근 종료 경기)가 있으면 첫 카드는 그 경기의 하이라이트를 검색
    // - 위 LIVE 카드(highlightList)와 카드끼리 같은 영상이 겹치지 않게 제외
    highlightCategories: [],
    onFetchHighlightCategories: async (latestMatch) => {
        if (get().highlightCategories.length > 0 || !YOUTUBE_KEY) return;
        try {
            const home = latestMatch?.homeTeam?.shortName || latestMatch?.homeTeam?.name;
            const away = latestMatch?.awayTeam?.shortName || latestMatch?.awayTeam?.name;
            const matchQuery = home && away ? `${home} vs ${away} 하이라이트` : null;

            const rows = await withCache(`sport-yt-categories:${matchQuery || "default"}`, async () => {
                // 위 LIVE 카드(TheSportsDB)와 같은 영상은 제외
                const used = new Set(get().highlightList.map((v) => v.id?.videoId));
                const results = await Promise.all(HIGHLIGHT_CATEGORIES.map(async (cat, i) => {
                    const q = i === 0 && matchQuery ? matchQuery : cat.query;
                    const data = await youtubeGet("search", { part: "snippet", q, type: "video", maxResults: "5" });
                    return { cat, items: data.items || [] };
                }));
                return results.map(({ cat, items }) => {
                    const video = items.find((v) => v.id?.videoId && !used.has(v.id.videoId)) || items[0] || null;
                    if (video?.id?.videoId) used.add(video.id.videoId);
                    return { key: cat.key, label: cat.label, video };
                });
            });
            set({ highlightCategories: rows });
        } catch (error) {
            console.error("하이라이트(YouTube) 조회 실패:", error);
        }
    },

    // 7. 숏츠 영상 저장 (#shorts 검색 후 videos API 로 길이 3분 이하만 남김 / 6시간 캐시)
    shortsVideos: [],
    onFetchShorts: async (query = "축구 쇼츠 #shorts") => {
        if (get().shortsVideos.length > 0 || !YOUTUBE_KEY) return;
        try {
            const items = await withCache(`sport-yt-shorts:${query}`, async () => {
                const search = await youtubeGet("search", {
                    part: "snippet", q: query, type: "video", videoDuration: "short", maxResults: "25",
                    videoCategoryId: "17", relevanceLanguage: "ko", regionCode: "KR",
                });
                const ids = (search.items || []).map((v) => v.id?.videoId).filter(Boolean);
                if (!ids.length) return [];
                const details = await youtubeGet("videos", { part: "contentDetails", id: ids.join(",") });
                const seconds = Object.fromEntries(
                    (details.items || []).map((v) => [v.id, durationToSeconds(v.contentDetails?.duration)])
                );
                return (search.items || []).filter((v) => seconds[v.id?.videoId] <= 180).slice(0, 10);
            });
            set({ shortsVideos: items });
        } catch (error) {
            console.error("숏츠 영상 조회 실패:", error);
        }
    },
}));