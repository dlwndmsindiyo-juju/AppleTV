import { SPORT_TEAMS } from "../../data/sportTeams";
import { isLive } from "./sportUtils";

// 요청한 시안용 샘플입니다. 실제 경기가 없을 때 히어로와 배너가 같은 경기를 표시합니다.
const SAMPLE_MATCH = {
  id: "sport-presentation-sample",
  status: "IN_PLAY",
  minute: 87,
  competition: { name: "프리미어리그" },
  homeTeam: { name: "Chelsea", shortName: "첼시" },
  awayTeam: { name: "Manchester United", shortName: "맨체스터 Utd" },
  score: { fullTime: { home: 3, away: 3 } },
};

export const getPresentationMatch = (matches = []) => matches.find(isLive) || SAMPLE_MATCH;

export const sportTeamLabel = (team) => {
  if (!team) return "";
  const found = SPORT_TEAMS.find((item) =>
    item.enName === team.name || item.enName === team.shortName
  );
  return found?.shortName || team.shortName || team.name;
};
