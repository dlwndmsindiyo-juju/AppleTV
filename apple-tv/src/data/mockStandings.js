// src/data/mockStandings.js
// MLS 2026 정규시즌 컨퍼런스 순위 목업 (TheSportsDB 순위를 못 받을 때 사용)
// - 스포츠 홈 "리그 순위": 컨퍼런스별 상위 5팀
// - 리그 순위 상세(/sport/standings): 컨퍼런스별 전체 15팀
import { SPORT_TEAMS } from "./sportTeams";

const findTeam = (id) => SPORT_TEAMS.find((t) => t.id === id);

// [팀 id, 경기, 승, 무, 패, 승점]
const toRows = (conference, rows) =>
  rows.map(([id, playedGames, won, draw, lost, points], index) => ({
    position: index + 1,
    team: findTeam(id),
    playedGames, won, draw, lost, points,
    conference,
  }));

export const CONFERENCE_STANDINGS = {
  east: toRows("east", [
    ["nashville", 30, 20, 7, 3, 67],
    ["miami", 30, 15, 10, 5, 55],
    ["new-england", 30, 16, 4, 10, 52],
    ["chicago", 30, 14, 6, 10, 48],
    ["charlotte", 30, 13, 8, 9, 47],
    ["philadelphia", 30, 13, 7, 10, 46],
    ["orlando", 30, 12, 5, 13, 41],
    ["red-bulls", 30, 10, 6, 14, 36],
    ["cincinnati", 30, 9, 9, 11, 36],
    ["toronto", 30, 8, 12, 10, 36],
    ["columbus", 30, 12, 5, 15, 35],
    ["nycfc", 30, 5, 10, 12, 34],
    ["dc", 29, 10, 12, 10, 33],
    ["atlanta", 30, 16, 6, 16, 30],
    ["montreal", 30, 17, 7, 17, 25],
  ]),
  west: toRows("west", [
    ["vancouver", 30, 16, 7, 7, 55],
    ["st-louis", 30, 14, 9, 7, 51],
    ["dallas", 30, 14, 9, 7, 51],
    ["san-jose", 30, 13, 9, 8, 48],
    ["houston", 30, 13, 8, 9, 47],
    ["lafc", 30, 13, 6, 11, 45],
    ["seattle", 30, 12, 8, 10, 44],
    ["minnesota", 30, 11, 9, 10, 42],
    ["san-diego", 30, 11, 7, 12, 40],
    ["portland", 30, 10, 8, 12, 38],
    ["austin", 30, 10, 6, 14, 36],
    ["colorado", 30, 9, 7, 14, 34],
    ["salt-lake", 30, 8, 7, 15, 31],
    ["la-galaxy", 30, 7, 8, 15, 29],
    ["kansas-city", 30, 7, 5, 18, 26],
  ]),
};
