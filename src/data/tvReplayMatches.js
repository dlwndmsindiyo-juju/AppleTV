// TV 영상 끝 화면 "경기 다시보기" 카드 (시안: 10 · 처음부터 보기)
// - homeId / awayId : data/sportTeams.js 의 구단 id (뱃지는 배경 없는 뱃지)
// - code : 카드 아래 팀 약칭 · score : [홈, 원정] · date : 카드 가운데 날짜
// - 카드를 누르면 "홈 vs 원정 하이라이트" 영상을 찾아 바로 재생 (useSportStore.onFetchHighlights)
export const TV_REPLAY_MATCHES = [
  { id: "tv-replay-1", homeId: "portland", awayId: "charlotte", home: "POR", away: "CLT", score: [3, 2], date: "10월 25일" },
  { id: "tv-replay-2", homeId: "lafc", awayId: "la-galaxy", home: "LAFC", away: "LA", score: [2, 2], date: "10월 25일" },
  { id: "tv-replay-3", homeId: "san-diego", awayId: "seattle", home: "SD", away: "SEA", score: [2, 2], date: "10월 25일" },
  { id: "tv-replay-4", homeId: "kansas-city", awayId: "austin", home: "SKC", away: "ATX", score: [1, 2], date: "10월 25일" },
];
