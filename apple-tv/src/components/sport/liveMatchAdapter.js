// =====================================================================
// 라이브 상세 데이터 어댑터
// - 어떤 경기든 라이브 상세(SportLivePage)가 쓰는 "같은 모양"으로 바꿔 줌
//   { id, competition, status, minute, homeId, awayId, teams, score, title, date,
//     lineups, commentary, stats, chatRoom, chat }
// - 1) 시안 경기(sample): data/mockLiveMatch.js 그대로
// - 2) 목업 다른 경기(l1 ~ l7): 시안 경기를 틀로 팀만 바꿔 생성 (라인업 · 기록은 예시 값)
// - 3) 실제 라이브 경기(TheSportsDB idEvent): lookupevent · lookuplineup · lookuptimeline · lookupeventstats 응답을 변환
// =====================================================================
import { SPORT_TEAMS, getTeamById } from "../../data/sportTeams";
import { LIVE_MATCH, LIVE_OTHER_MATCHES } from "../../data/mockLiveMatch";
import { teamInfo } from "./standingsUtils";

const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

// ---------- 팀 ----------
// MLS 구단이면 data/sportTeams.js 의 구단(한글 이름 · 색 · 배너), 아니면 API 정보로 만든 팀
export const toTeam = ({ id, name, badge }) => {
  const mls = teamInfo({ name, shortName: name });
  if (mls) return mls;
  return {
    id: `ext-${id || name}`,
    shortName: name,
    name,
    enName: name,
    conference: null,
    logo: badge || "",
    color: "#2E2E2E",
    banner: null,
  };
};

// ---------- 포메이션 → 경기장 좌표 ----------
// "4-3-3" → 골키퍼(아래) + 수비 · 미드 · 공격 줄을 아래에서 위로 배치 (x · y 는 경기장 카드 안 %)
const POSITION_ORDER = (pos = "") => {
  const p = pos.toLowerCase();
  if (/goal|keeper|^gk$/.test(p)) return 0;
  if (/back|defen|^d|cb|lb|rb/.test(p)) return 1;
  if (/mid|^m|dm|am|cm/.test(p)) return 2;
  return 3; // forward / wing / striker
};

export const placeByFormation = (players, formation) => {
  const sorted = [...players].sort((a, b) => POSITION_ORDER(a.pos) - POSITION_ORDER(b.pos));
  const outfield = sorted.length - 1;
  let lines = String(formation || "").split("-").map(Number).filter((n) => n > 0);
  if (lines.reduce((a, b) => a + b, 0) !== outfield) {
    // 포메이션 정보가 없거나 인원이 안 맞으면 포지션 그룹으로 줄을 만듦
    const groups = [1, 2, 3].map((g) => sorted.filter((pl) => POSITION_ORDER(pl.pos) === g).length).filter(Boolean);
    lines = groups.length ? groups : [4, 3, 3];
  }
  const out = [];
  const [gk, ...rest] = sorted;
  if (gk) out.push({ ...gk, x: 50, y: 82 });
  const top = 14, bottom = 64;
  let index = 0;
  lines.forEach((count, li) => {
    const y = lines.length === 1 ? 40 : bottom - ((bottom - top) / (lines.length - 1)) * li;
    for (let i = 0; i < count && index < rest.length; i += 1, index += 1) {
      const x = 15 + (70 / (count + 1)) * (i + 1);
      out.push({ ...rest[index], x: Math.round(x), y: Math.round(y) });
    }
  });
  return out;
};

// ---------- 공통 ----------
const halfMarker = (events, leftId, rightId) => {
  const goals = (team) => events.filter((e) => e.type === "goal" && e.team === team && parseInt(e.minute, 10) <= 45).length;
  return { type: "half", label: "전반종료", score: { [leftId]: goals(leftId), [rightId]: goals(rightId) } };
};

// 시간 순(최신 위) 정렬 + 전반 종료 띠 넣기 (경기가 후반이면)
const withHalf = (events, leftId, rightId, minute) => {
  const sorted = [...events].sort((a, b) => parseInt(b.minute, 10) - parseInt(a.minute, 10));
  if (!minute || minute <= 45) return sorted;
  const idx = sorted.findIndex((e) => parseInt(e.minute, 10) <= 45);
  const marker = halfMarker(sorted, leftId, rightId);
  if (idx < 0) return [...sorted, marker];
  return [...sorted.slice(0, idx), marker, ...sorted.slice(idx)];
};

const defaultChat = (competition, teamId) =>
  LIVE_MATCH.chat.map((m) => ({ ...m, team: teamId }));

// ---------- 2) 목업 다른 경기 ----------
// 예시용 선수단 (구단별 실제 선수 데이터가 없어 포지션 · 등번호만 같은 틀을 사용)
const genericLineup = (team) => ({
  formation: "4-3-3",
  coach: "-",
  starters: placeByFormation(
    [
      { num: 1, name: `${team.shortName} 골키퍼`, pos: "골키퍼" },
      { num: 2, name: "라이트백", pos: "라이트백" }, { num: 4, name: "센터백", pos: "센터백" },
      { num: 5, name: "센터백", pos: "센터백" }, { num: 3, name: "레프트백", pos: "레프트백" },
      { num: 6, name: "중앙 MF", pos: "중앙 MF" }, { num: 8, name: "중앙 MF", pos: "중앙 MF" },
      { num: 10, name: "공격형 MF", pos: "공격형 MF" },
      { num: 7, name: "윙어", pos: "윙어" }, { num: 9, name: "스트라이커", pos: "스트라이커" }, { num: 11, name: "윙어", pos: "윙어" },
    ].map((pl) => ({ ...pl, photo: null })),
    "4-3-3"
  ),
  subs: [12, 14, 15, 16, 17, 18, 20, 21].map((n) => ({ num: n, name: `후보 ${n}`, photo: null })),
});

const buildMockOther = (other) => {
  const home = getTeamById(other.homeId);
  const away = getTeamById(LIVE_MATCH.awayId);
  if (!home || !away) return null;
  // 경기마다 다른 예시 점수 (id 기준으로 고정)
  const seed = other.id.charCodeAt(other.id.length - 1);
  const score = { home: seed % 3, away: (seed + 1) % 2 };
  const events = [];
  for (let i = 0; i < score.away; i += 1) events.push({ minute: `${8 + i * 6}'`, team: away.id, type: "goal", player: "토론토 득점" });
  for (let i = 0; i < score.home; i += 1) events.push({ minute: `${5 + i * 7}'`, team: home.id, type: "goal", player: `${home.shortName} 득점` });
  return {
    id: other.id,
    competition: "MLS",
    status: "IN_PLAY",
    minute: other.minute,
    homeId: home.id,
    awayId: away.id,
    teams: { [home.id]: home, [away.id]: away },
    score,
    title: LIVE_MATCH.title,
    date: LIVE_MATCH.date,
    lineups: { [away.id]: LIVE_MATCH.lineups[away.id], [home.id]: genericLineup(home) },
    commentary: withHalf(events, away.id, home.id, other.minute),
    stats: LIVE_MATCH.stats.map((row) => ({
      ...row,
      values: row.unit === "%"
        ? { [away.id]: 50 + (seed % 9), [home.id]: 50 - (seed % 9) }
        : { [away.id]: (row.values.toronto + seed) % 9, [home.id]: (row.values.nashville + seed * 2) % 9 },
    })),
    chatRoom: { ...LIVE_MATCH.chatRoom, users: 1200 + seed * 37, messages: 300 + seed * 11 },
    chat: defaultChat("MLS", away.id),
    isMock: true,
  };
};

// ---------- 1) 시안 경기 ----------
const buildSample = () => {
  const home = getTeamById(LIVE_MATCH.homeId);
  const away = getTeamById(LIVE_MATCH.awayId);
  return { ...LIVE_MATCH, teams: { [home.id]: home, [away.id]: away }, isMock: true };
};

// 목업 경기 찾기 (sample · l1 ~ l7)
export const getMockLiveMatch = (id) => {
  if (!id || id === LIVE_MATCH.id) return buildSample();
  const other = LIVE_OTHER_MATCHES.find((m) => m.id === id);
  return other ? buildMockOther(other) : null;
};

// 목업 경기 목록 (오른쪽 "다른 라이브 경기")
export const MOCK_LIVE_IDS = [LIVE_MATCH.id, ...LIVE_OTHER_MATCHES.map((m) => m.id)];

// ---------- 3) TheSportsDB 실제 경기 ----------
// ※ TheSportsDB 응답 필드는 리그 · 경기마다 비어 있는 값이 많아 없는 값은 "-" / 빈 배열로 둠
const STAT_LABELS = {
  "ball possession": { label: "볼점유율", unit: "%" },
  "total shots": { label: "슈팅" },
  "shots on goal": { label: "유효슈팅" },
  "corner kicks": { label: "코너킥" },
  "fouls": { label: "파울" },
  "offsides": { label: "오프사이드" },
  "yellow cards": { label: "경고" },
  "free kicks": { label: "프리킥" },
};

const isHome = (v) => String(v).toLowerCase() === "yes";

export const buildFromSportsDb = ({ event, lineup = [], timeline = [], stats = [] }) => {
  if (!event) return null;
  const home = toTeam({ id: event.idHomeTeam, name: event.strHomeTeam, badge: event.strHomeTeamBadge });
  const away = toTeam({ id: event.idAwayTeam, name: event.strAwayTeam, badge: event.strAwayTeamBadge });
  const minute = parseInt(event.strProgress, 10) || null;

  // 라인업
  const lineupOf = (team, homeSide) => {
    const rows = lineup.filter((r) => isHome(r.strHome) === homeSide);
    const toPlayer = (r) => ({
      num: num(r.intSquadNumber) ?? "-",
      name: r.strPlayer,
      pos: r.strPosition || r.strPositionShort || "",
      photo: r.strCutout || r.strThumb || null,
    });
    const starters = rows.filter((r) => !isHome(r.strSubstitute)).map(toPlayer);
    const formation = homeSide ? event.strHomeFormation : event.strAwayFormation;
    return {
      formation: formation || "-",
      coach: (homeSide ? event.strHomeCoach : event.strAwayCoach) || "-",
      starters: placeByFormation(starters, formation),
      subs: rows.filter((r) => isHome(r.strSubstitute)).map(toPlayer),
    };
  };

  // 중계 (골 · 카드 · 교체)
  const events = timeline.map((t) => {
    const team = isHome(t.strHome) ? home.id : away.id;
    const kind = `${t.strTimeline || ""} ${t.strTimelineDetail || ""}`.toLowerCase();
    const minuteLabel = `${t.intTime ?? ""}'`;
    if (/goal/.test(kind)) return { minute: minuteLabel, team, type: "goal", player: t.strPlayer, assist: t.strAssist ? `${t.strAssist} 도움` : "" };
    if (/red/.test(kind)) return { minute: minuteLabel, team, type: "red", player: t.strPlayer };
    if (/card|yellow/.test(kind)) return { minute: minuteLabel, team, type: "yellow", player: t.strPlayer };
    if (/subst/.test(kind)) return { minute: minuteLabel, team, type: "sub", in: t.strPlayer, out: t.strAssist || "" };
    return null;
  }).filter(Boolean);

  // 기록
  const statRows = stats
    .map((s) => {
      const meta = STAT_LABELS[String(s.strStat || "").toLowerCase()];
      if (!meta) return null;
      return { label: meta.label, unit: meta.unit, values: { [away.id]: num(s.intAway) ?? 0, [home.id]: num(s.intHome) ?? 0 } };
    })
    .filter(Boolean);

  return {
    id: event.idEvent,
    competition: event.strLeague || "",
    status: "IN_PLAY",
    minute,
    homeId: home.id,
    awayId: away.id,
    teams: { [home.id]: home, [away.id]: away },
    score: { home: num(event.intHomeScore) ?? 0, away: num(event.intAwayScore) ?? 0 },
    title: [event.strLeague, event.strSeason].filter(Boolean).join(" "),
    date: (event.dateEvent || "").replaceAll("-", "."),
    lineups: { [away.id]: lineupOf(away, false), [home.id]: lineupOf(home, true) },
    commentary: withHalf(events, away.id, home.id, minute),
    stats: statRows,
    chatRoom: { title: event.strLeague || "라이브 채팅", users: 0, messages: 0 },
    chat: defaultChat(event.strLeague, away.id),
    isMock: false,
  };
};

// MLS 구단 목록 (외부 팀 판별용 export)
export { SPORT_TEAMS };

// ---------- 라이브 목록 한 줄 → lookupevent 모양 ----------
// - lookupevent 응답이 아직 없거나 실패해도, 홈 · LIVE 배너가 쓰는 liveMatches 한 줄로 점수 · 팀 · 시간은 표시
// - lookupevent 가 있으면 그 값을 쓰되, 점수 · 진행 시간은 더 자주 갱신되는 livescore 값을 우선
export const liveRowToEvent = (row, apiEvent) => {
  if (!row && !apiEvent) return null;
  const base = row
    ? {
        idEvent: String(row.id),
        strLeague: row._league || row.competition?.name || "",
        strHomeTeam: row.homeTeam?.shortName || row.homeTeam?.name,
        strAwayTeam: row.awayTeam?.shortName || row.awayTeam?.name,
        strHomeTeamBadge: row.homeTeam?.crest,
        strAwayTeamBadge: row.awayTeam?.crest,
        intHomeScore: row.score?.fullTime?.home,
        intAwayScore: row.score?.fullTime?.away,
        strProgress: row.minute ? String(row.minute) : "",
        dateEvent: (row.utcDate || new Date().toISOString()).slice(0, 10),
      }
    : {};
  const merged = { ...base };
  const empty = (v) => v === null || v === undefined || v === "";
  const LIVE_FIRST = ["intHomeScore", "intAwayScore", "strProgress"];
  Object.entries(apiEvent || {}).forEach(([k, v]) => {
    if (empty(v)) return;
    if (LIVE_FIRST.includes(k) && !empty(merged[k])) return;
    merged[k] = v;
  });
  return merged;
};
