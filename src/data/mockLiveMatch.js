// src/data/mockLiveMatch.js
// 라이브 상세(/sport/match/:id) 목업 — 시안(라이브 상세.pdf) 기준
// - 실제 라이브 데이터(라인업 · 기록 · 중계)는 무료 API 로 받기 어려워 우선 목업으로 구성
// - 선수 사진: public/images/players/live/{photo} 를 넣으면 표시, 없으면 등번호 원으로 대체
// - 포메이션 좌표(x, y): 경기장 카드 안 % 위치 (x: 왼쪽→오른쪽, y: 위(상대 골문)→아래(우리 골문))

const PHOTO = `${import.meta.env.BASE_URL}images/players/live/`;
const p = (num, name, pos, x, y, photo) => ({ num, name, pos, x, y, photo: photo ? `${PHOTO}${photo}` : null });
const sub = (num, name, photo) => ({ num, name, photo: photo ? `${PHOTO}${photo}` : null });

export const LIVE_MATCH = {
  id: "sample",
  competition: "MLS",
  status: "IN_PLAY",
  minute: 87,
  homeId: "nashville",
  awayId: "toronto",
  score: { home: 3, away: 3 },

  // 라인업 (팀 id 기준)
  lineups: {
    toronto: {
      formation: "3-2-4",
      coach: "누넌",
      starters: [
        p(8, "오스본", "공격형 MF", 50, 14),
        p(10, "베르나르데스키", "윙어", 32, 20),
        p(7, "코스타", "윙어", 66, 20),
        p(6, "플로레스", "중앙 MF", 24, 41),
        p(5, "피터슨", "중앙 MF", 50, 39),
        p(9, "케르", "스트라이커", 74, 41),
        p(4, "로몰", "센터백", 41, 60),
        p(2, "길핀", "센터백", 59, 60),
        p(3, "마르셀로", "레프트백", 26, 66),
        p(11, "램지", "라이트백", 75, 68),
        p(1, "길렌", "골키퍼", 50, 82),
      ],
      subs: [
        sub(16, "발로우"), sub(14, "음보마 뎀"), sub(27, "아눈가"), sub(29, "라미레스"),
        sub(2, "파웰"), sub(15, "하데베"), sub(4, "해글런드"), sub(13, "로우로"),
      ],
    },
    nashville: {
      formation: "3-4-3",
      coach: "바틀렛",
      starters: [
        p(10, "무이유", "스트라이커", 50, 14),
        p(11, "수르리지", "윙어", 28, 20),
        p(7, "라이언", "윙어", 72, 20),
        p(6, "얼링", "중앙 MF", 38, 40),
        p(8, "고도이", "중앙 MF", 62, 40),
        p(3, "로이", "레프트백", 18, 46),
        p(14, "라이머", "라이트백", 82, 46),
        p(4, "자보", "센터백", 30, 64),
        p(5, "마허", "센터백", 50, 66),
        p(2, "팔라시오스", "센터백", 70, 64),
        p(1, "윌리스", "골키퍼", 50, 82),
      ],
      subs: [
        sub(16, "바리보"), sub(14, "스트라우드"), sub(27, "터너"), sub(29, "호세이 키지마"),
        sub(2, "닐리스"), sub(15, "마르코비치"), sub(4, "헤프티"), sub(13, "알렉스 보노"),
      ],
    },
  },

  // 경기 제목 · 날짜 (기록 탭 상단)
  title: "메이저 리그 사커(MLS) 정규 시즌 경기 - 1부",
  date: "2026.09.27",

  // 중계 타임라인 (최신이 위)
  // - team: 이벤트 팀 id → 왼쪽 팀(토론토) 이벤트는 왼쪽, 상대 팀은 오른쪽에 표시
  // - type: goal(골) · sub(교체: in / out) · yellow(경고) · red(퇴장) · half(전반 종료 구분선)
  commentary: [
    { minute: "+1'", team: "toronto", type: "goal", player: "오스번", assist: "베르나르데스키 도움" },
    { minute: "87'", team: "toronto", type: "sub", in: "폴로더", out: "팀 파커" },
    { minute: "87'", team: "toronto", type: "sub", in: "로하스", out: "소포" },
    { minute: "86'", team: "nashville", type: "yellow", player: "마허" },
    { minute: "85'", team: "nashville", type: "sub", in: "바리보", out: "고도이" },
    { minute: "84'", team: "toronto", type: "sub", in: "워스", out: "코네" },
    { minute: "71'", team: "nashville", type: "sub", in: "스트라우드", out: "라이언" },
    { minute: "66'", team: "nashville", type: "goal", player: "무이유", assist: "수르리지 도움" },
    { minute: "64'", team: "toronto", type: "sub", in: "페드로 카스트로", out: "루발카바" },
    { minute: "52'", team: "toronto", type: "goal", player: "케르" },
    { type: "half", label: "전반종료", score: { toronto: 1, nashville: 2 } },
    { minute: "38'", team: "nashville", type: "goal", player: "수르리지", assist: "얼링 도움" },
    { minute: "35'", team: "toronto", type: "yellow", player: "플로레스" },
    { minute: "22'", team: "toronto", type: "goal", player: "베르나르데스키", assist: "코스타 도움" },
    { minute: "9'", team: "nashville", type: "goal", player: "무이유" },
  ],

  // 기록 (팀 id 별 값)
  stats: [
    { label: "볼점유율", values: { toronto: 62, nashville: 38 }, unit: "%" },
    { label: "슈팅", values: { toronto: 11, nashville: 5 } },
    { label: "유효슈팅", values: { toronto: 4, nashville: 1 } },
    { label: "코너킥", values: { toronto: 3, nashville: 5 } },
    { label: "프리킥", values: { toronto: 14, nashville: 12 } },
    { label: "오프사이드", values: { toronto: 1, nashville: 3 } },
    { label: "경고", values: { toronto: 1, nashville: 2 } },
  ],

  // 채팅 (minutesAgo: 몇 분 전 / likes: 인기순 정렬용 / team: 프로필 뱃지)
  chatRoom: { title: "메이저 리그", users: 9927, messages: 1616 },
  chat: [
    { id: 1, user: "땃쥐", team: "toronto", text: "야르야르야르야르렁~~~~~~~~~~~", minutesAgo: 8, likes: 12 },
    { id: 2, user: "닉넴2", team: "toronto", text: "행복하자,.우리...행복하자...", minutesAgo: 8, likes: 31 },
    { id: 3, user: "오렌지렌지", team: "toronto", text: "시즌 시작하고 첫승 ㄱㄱㄱ", minutesAgo: 9, likes: 54 },
    { id: 4, user: "dodw22", team: "nashville", text: "똑바로 좀 해라 좀.", minutesAgo: 10, likes: 7 },
    { id: 5, user: "오늘도축구", team: "toronto", text: "화이팅화이팅!!!!!@@@@@@@@@@@", minutesAgo: 11, likes: 19 },
    { id: 6, user: "축구는내인생", team: "nashville", text: "야르야르!! 쮀쮀이야 ~~", minutesAgo: 12, likes: 3 },
    { id: 7, user: "ektha3848", team: "toronto", text: "할 수 있음 ㄹㅇ 할 수 있다ㅏㅏ고", minutesAgo: 13, likes: 41 },
    { id: 8, user: "ekdji123", team: "toronto", text: "이얏호 할 수 있어으푸", minutesAgo: 15, likes: 26 },
  ],
};

// 오른쪽 목록: 같은 시간 다른 라이브 경기 (원정팀 id 기준 "OO VS 토론토")
export const LIVE_OTHER_MATCHES = [
  { id: "l1", homeId: "houston", minute: 22 },
  { id: "l2", homeId: "atlanta", minute: 22 },
  { id: "l3", homeId: "san-jose", minute: 22 },
  { id: "l4", homeId: "orlando", minute: 22 },
  { id: "l5", homeId: "kansas-city", minute: 22 },
  { id: "l6", homeId: "red-bulls", minute: 22 },
  { id: "l7", homeId: "columbus", minute: 22 },
];
