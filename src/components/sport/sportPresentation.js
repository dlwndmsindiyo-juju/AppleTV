import { SPORT_TEAMS } from "../../data/sportTeams";
import { isLive } from "./sportUtils";

// 화면 전체에서 함께 쓰는 "대표 경기" (히어로 · 하단 LIVE 배너 · 라이브 상세가 같은 경기를 표시)
// - 실제 진행 중 경기가 있으면 그 경기, 없으면 아래 시안용 샘플 경기
// - 샘플은 data/mockLiveMatch.js (라이브 상세 목업)와 같은 경기: 내슈빌 3 : 3 토론토 · 후반 87분
export const SAMPLE_MATCH = {
  id: "sample",
  status: "IN_PLAY",
  minute: 87,
  utcDate: new Date().toISOString(),
  competition: { name: "MLS" },
  homeTeam: { name: "Nashville SC", shortName: "Nashville" },
  awayTeam: { name: "Toronto FC", shortName: "Toronto" },
  score: { fullTime: { home: 3, away: 3 } },
};

export const getPresentationMatch = (matches = []) => matches.find(isLive) || SAMPLE_MATCH;
export const isSampleMatch = (match) => match?.id === SAMPLE_MATCH.id;

export const sportTeamLabel = (team) => {
  if (!team) return "";
  const found = SPORT_TEAMS.find((item) =>
    item.enName === team.name || item.enName === team.shortName
  );
  return found?.shortName || team.shortName || team.name;
};
