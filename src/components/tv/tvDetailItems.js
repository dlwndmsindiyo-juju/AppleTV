// [추가] TV 상세 페이지(TvDetail)에 넘길 항목 만들기 — 홈 · 스포츠 · 검색 · 상세 안 카드가 같이 사용
// - OTT : { kind: "ott", type: "movie" | "tv", id, title, image }
// - 스포츠: { kind: "sport", key, title, image, prefix, label, desc, videoId?, resolve? }
//   · videoId: 바로 재생할 YouTube 영상 · resolve(): 영상을 찾아서 돌려줌 (경기 → "홈 vs 원정 하이라이트" 검색)
import { useSportStore } from "../../store/useSportStore";
import { getTeamById } from "../../data/sportTeams";
import { decodeHtml, ytThumb } from "../sport/sportUtils";
import { TMDB_IMG } from "../../utils/tmdb";

export const SPORT_DESC = "MLS의 모든 순간을 Apple TV에서. 실시간 경기와 하이라이트, 다시보기까지 한곳에서 즐겨보세요.";

// TMDB 작품 (영화 · 시리즈)
export const ottItem = (r, type = r.media_type) => ({
  kind: "ott",
  key: `ott-${type}-${r.id}`,
  type: type === "tv" ? "tv" : "movie",
  id: r.id,
  title: r.title || r.name,
  image: r.backdrop_path ? `${TMDB_IMG}/original${r.backdrop_path}` : r.poster_path ? `${TMDB_IMG}/w780${r.poster_path}` : "",
});

// YouTube 영상 (하이라이트 · 라이브 클립 등)
export const videoItem = (v, { label = "하이라이트", prefix = "MLS" } = {}) => ({
  kind: "sport",
  key: `video-${v.id?.videoId || v.id}`,
  videoId: v.id?.videoId || v.id,
  title: v.title || decodeHtml(v.snippet?.title),
  image: v.image || ytThumb(v),
  desc: v.desc ?? decodeHtml(v.snippet?.description),
  label,
  prefix,
});

// 경기 (MLS) → 그 경기 하이라이트를 찾아서 재생
export const matchItem = ({ id, homeId, awayId, title, image, label = "경기 하이라이트" }) => {
  const home = getTeamById(homeId);
  const away = getTeamById(awayId);
  const key = `match-${id}`;
  return {
    kind: "sport",
    key,
    title: title || `${home?.shortName} vs. ${away?.shortName}`,
    image: image || "",
    label,
    prefix: "MLS",
    homeId,
    awayId,
    resolve: async () => {
      const st = useSportStore.getState();
      await st.onFetchHighlights(key, `${home?.enName || home?.name} vs ${away?.enName || away?.name}`);
      const found = (useSportStore.getState().highlights[key] || []).find((v) => v?.id?.videoId);
      return found ? { videoId: found.id.videoId, image: ytThumb(found), desc: decodeHtml(found.snippet?.description) } : null;
    },
  };
};

// 경기 다시보기 리그 (data/replayLeagues.js)
export const leagueItem = (l, thumb) => ({
  kind: "sport",
  key: `league-${l.id}`,
  videoId: l.thumbVideoId,
  title: `${l.league} 다시보기`,
  image: thumb || "",
  label: "경기 다시보기",
  prefix: l.league,
  desc: `${l.country} ${l.league}의 명경기와 하이라이트를 다시 만나보세요.`,
});

// 추천 시리즈 (data/mockSportSeries.js · youtubeUrl)
export const seriesItem = (s) => ({
  kind: "sport",
  key: `series-${s.id}`,
  videoId: (s.youtubeUrl || "").match(/[?&]v=([\w-]{11})/)?.[1] || null,
  title: s.title,
  image: s.poster,
  label: s.category || "추천 시리즈",
  prefix: "MLS",
  desc: s.description,
});
