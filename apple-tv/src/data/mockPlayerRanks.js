// src/data/mockPlayerRanks.js
// 리그 순위 상세(/sport/standings) "선수 순위" 목업 (탭별 상위 3명)
// - photo: public/images/players/ 에 이미지를 넣으면 표시, 없으면 이름 첫 글자 원형으로 대체
// - teamId: data/sportTeams.js 의 id (구단 이름 표시용)

const BASE = `${import.meta.env.BASE_URL}images/players/`;
const photo = (file) => `${BASE}${file}`;

export const PLAYER_RANKS = [
  {
    key: "goals",
    label: "득점왕",
    unit: "골",
    players: [
      { id: "messi", name: "메시", teamId: "miami", value: 25, photo: photo("messi.png") },
      { id: "musa", name: "무사", teamId: "dallas", value: 20, photo: photo("musa.png") },
      { id: "uhre", name: "일로스키", teamId: "philadelphia", value: 19, photo: photo("Iloski.png") },
    ],
  },
  {
    key: "assists",
    label: "도움왕",
    unit: "도움",
    players: [
      { id: "messi", name: "메시", teamId: "miami", value: 18, photo: photo("messi.png") },
      { id: "dreyer", name: "드레이어", teamId: "san-diego", value: 16, photo: photo("dreyer.png") },
      { id: "evander", name: "에반데르", teamId: "cincinnati", value: 14, photo: photo("evander.png") },
    ],
  },
  {
    key: "points",
    label: "공격포인트",
    unit: "포인트",
    players: [
      { id: "messi", name: "메시", teamId: "miami", value: 43, photo: photo("messi.png") },
      { id: "musa", name: "무사", teamId: "dallas", value: 29, photo: photo("musa.png") },
      { id: "dreyer", name: "드레이어", teamId: "san-diego", value: 28, photo: photo("dreyer.png") },
    ],
  },
];
