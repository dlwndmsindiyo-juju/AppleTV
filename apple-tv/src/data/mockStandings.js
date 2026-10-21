// src/data/mockStandings.js
import { SPORT_TEAMS } from "./sportTeams";

const findTeam = (id) => SPORT_TEAMS.find((t) => t.id === id);

export const CONFERENCE_STANDINGS = {
  east: [
    { position: 1, team: findTeam("nashville"), playedGames: 30, won: 20, draw: 7, lost: 3, points: 67, conference: "east" },
    { position: 2, team: findTeam("miami"), playedGames: 30, won: 15, draw: 10, lost: 5, points: 55, conference: "east" },
    { position: 3, team: findTeam("new-england"), playedGames: 30, won: 16, draw: 4, lost: 10, points: 52, conference: "east" },
    { position: 4, team: findTeam("chicago"), playedGames: 30, won: 14, draw: 6, lost: 10, points: 48, conference: "east" },
    { position: 5, team: findTeam("charlotte"), playedGames: 30, won: 13, draw: 8, lost: 9, points: 47, conference: "east" },
  ],
  west: [
    { position: 1, team: findTeam("vancouver"), playedGames: 30, won: 16, draw: 7, lost: 7, points: 55, conference: "west" },
    { position: 2, team: findTeam("st-louis"), playedGames: 30, won: 14, draw: 9, lost: 7, points: 51, conference: "west" },
    { position: 3, team: findTeam("dallas"), playedGames: 30, won: 14, draw: 9, lost: 7, points: 51, conference: "west" },
    { position: 4, team: findTeam("san-jose"), playedGames: 30, won: 13, draw: 9, lost: 8, points: 48, conference: "west" },
    { position: 5, team: findTeam("houston"), playedGames: 30, won: 13, draw: 8, lost: 9, points: 47, conference: "west" },
  ],
};