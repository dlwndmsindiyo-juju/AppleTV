// [추가] TV 상세 페이지(TvDetail)에 넘길 항목 만들기 — 홈 · 스포츠 · 검색 · 상세 안 카드가 같이 사용
// - OTT : { kind: "ott", type: "movie" | "tv", id, title, image }
// - 스포츠: { kind: "sport", key, title, image, prefix, label, desc, videoId?, resolve? }
//   · videoId: 바로 재생할 YouTube 영상 · resolve(): 영상을 찾아서 돌려줌 (경기 → "홈 vs 원정 하이라이트" 검색)
import { useSportStore } from "../../store/useSportStore";
import { getTeamById } from "../../data/sportTeams";
import { decodeHtml, ytThumb } from "../sport/sportUtils";
import { TMDB_IMG } from "../../utils/tmdb";

export const SPORT_DESC = "MLS의 모든 순간을 Apple TV에서. 실시간 경기와 하이라이트, 다시보기까지 한곳에서 즐겨보세요.";

// [추가] YouTube 설명 정리 — 링크 · 해시태그 · "undefined" 를 지우고 한 줄로 (카드 설명용 · 남는 게 없으면 "")
export const cleanText = (text = "") => {
  const s = String(text ?? "")
    .replace(/undefined|null/gi, " ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[#@][^\s#@]+/g, " ")
    .replace(/watch every match on apple tv|subscribe( now)?|the plays here|follow us( on)?|for more/gi, " ")
    .replace(/(\s*[:|·\-–]\s*)+(?=\s|$)/g, " ")
    .replace(/[▶►➡→⬇️👉🔔]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length >= 8 ? s : "";
};

// [추가] 스포츠 상세 줄거리 — YouTube 설명(링크 · undefined 가 섞임) 대신 경기 한 줄 요약
// - 따로 정한 문구(summary: 리그 다시보기 · 추천 시리즈)가 있으면 그대로
// - 경기: "A vs B" (팀 이름 · 영상 제목에서) + 종류(하이라이트 · 라이브 · 인터뷰 …)에 맞는 한 줄
const matchupOf = (item) => {
  const home = item.homeId && getTeamById(item.homeId);
  const away = item.awayId && getTeamById(item.awayId);
  if (home && away) return `${home.name} vs ${away.name}`;
  const m = String(item.title || "").replace(/^LIVE · /, "").match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[|:·\-–(]|$)/i);
  return m ? `${m[1].trim()} vs ${m[2].trim()}` : "";
};

export const sportSummary = (item = {}) => {
  if (item.summary) return item.summary;
  const vs = matchupOf(item);
  const label = item.label || "";
  if (/라이브/.test(label)) return vs ? `${vs}, 지금 진행 중인 경기를 실시간으로 만나보세요.` : "지금 진행 중인 경기를 실시간으로 만나보세요.";
  if (/인터뷰/.test(label)) return "선수와 감독이 직접 전하는 경기 뒤 이야기를 들어보세요.";
  if (/예정/.test(label)) return vs ? `${vs}, 다가오는 경기를 미리 확인하고 지난 맞대결 하이라이트를 만나보세요.` : "다가오는 경기를 미리 확인하세요.";
  if (/다시보기/.test(label)) return vs ? `${vs}, 경기 전체 흐름을 다시보기로 확인하세요.` : "지난 경기를 처음부터 다시 만나보세요.";
  if (vs) return `${vs}, 골 장면과 승부를 가른 주요 순간을 한눈에 확인하세요.`;
  if (/하이라이트/.test(label)) return "골 장면과 승부를 가른 주요 순간을 짧게 모은 하이라이트예요.";
  return SPORT_DESC;
};

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
  title: `${l.league || l.name || ""} 다시보기`.trim(),
  image: thumb || "",
  label: "경기 다시보기",
  prefix: l.league,
  // [수정] 국가(country) 값이 없는 항목(구단 다시보기 등)은 이름만 → "undefined" 가 보이던 문제
  summary: `${[l.country, l.league || l.name].filter(Boolean).join(" ")}의 명경기와 하이라이트를 다시 만나보세요.`,
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
  summary: s.description,
});
