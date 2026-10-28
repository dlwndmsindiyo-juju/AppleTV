// 리그 순위 공통 유틸 (스포츠 홈 "리그 순위" + 리그 순위 상세에서 함께 사용)
import { SPORT_TEAMS } from "../../data/sportTeams";

// 팀 이름 비교용 정규화: 악센트/FC·CF·SC/기호 제거 (예: "Atlanta United FC" = "Atlanta United")
const norm = (v = "") => String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\b(fc|cf|sc)\b/g, "").replace(/[^a-z0-9가-힣]/g, "");

// 순위 데이터의 팀 → data/sportTeams.js 의 구단 (한글 이름 · 로고 · 컨퍼런스)
export const teamInfo = (team) => {
  if (!team) return null;
  if (team.id && SPORT_TEAMS.some((t) => t.id === team.id)) return SPORT_TEAMS.find((t) => t.id === team.id);
  const targets = [team.name, team.shortName, team.enName].map(norm).filter(Boolean);
  const exact = SPORT_TEAMS.find((item) =>
    [item.enName, item.name, item.shortName].map(norm).some((n) => n && targets.includes(n))
  );
  if (exact) return exact;
  // 한쪽이 다른 쪽을 포함하는 경우까지 허용 (짧은 이름 오매칭 방지로 6자 이상만)
  return SPORT_TEAMS.find((item) => {
    const n = norm(item.enName);
    return n.length >= 6 && targets.some((t) => t.includes(n) || n.includes(t));
  });
};

// 컨퍼런스별 순위 (승점 → 원래 순위 순), limit 을 주면 상위 N팀만
export const conferenceRows = (standings, key, limit) => {
  const rows = (standings || [])
    .map((row) => ({ row, info: teamInfo(row.team) }))
    .filter(({ row, info }) => (row.conference || info?.conference) === key)
    .sort((a, b) => (b.row.points ?? 0) - (a.row.points ?? 0) || (a.row.position ?? 0) - (b.row.position ?? 0));
  return limit ? rows.slice(0, limit) : rows;
};

// 표에 쓸 구단 이름 · 로고
export const clubOf = ({ row, info }) => ({
  key: info?.id || row.team?.id || row.team?.name,
  logo: info?.logo || row.team?.crest,
  name: info?.shortName || row.team?.shortName || row.team?.name,
});
