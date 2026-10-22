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

  // 중계 (문자 중계, 최신이 위)
  commentary: [
    { minute: 87, type: "chance", text: "토론토 코스타의 오른쪽 크로스, 케르의 헤더가 골대를 살짝 벗어납니다." },
    { minute: 81, type: "goal", team: "toronto", text: "골! 토론토 베르나르데스키 동점골 (3 : 3)" },
    { minute: 74, type: "sub", team: "nashville", text: "교체: 내슈빌 고도이 OUT · 바리보 IN" },
    { minute: 66, type: "goal", team: "nashville", text: "골! 내슈빌 무이유 (3 : 2)" },
    { minute: 58, type: "card", team: "toronto", text: "경고: 토론토 플로레스" },
    { minute: 52, type: "goal", team: "toronto", text: "골! 토론토 케르 (2 : 2)" },
    { minute: 45, type: "info", text: "후반전 시작" },
    { minute: 38, type: "goal", team: "nashville", text: "골! 내슈빌 수르리지 (2 : 1)" },
    { minute: 22, type: "goal", team: "toronto", text: "골! 토론토 오스본 (1 : 1)" },
    { minute: 9, type: "goal", team: "nashville", text: "골! 내슈빌 무이유 선제골 (1 : 0)" },
    { minute: 0, type: "info", text: "경기 시작" },
  ],

  // 기록 (홈 / 원정)
  stats: [
    { label: "점유율", home: 46, away: 54, unit: "%" },
    { label: "슈팅", home: 14, away: 17 },
    { label: "유효 슈팅", home: 6, away: 7 },
    { label: "코너킥", home: 5, away: 8 },
    { label: "파울", home: 11, away: 9 },
    { label: "오프사이드", home: 2, away: 3 },
    { label: "경고", home: 1, away: 2 },
    { label: "패스 성공률", home: 82, away: 86, unit: "%" },
  ],

  // 채팅 첫 메시지
  chat: [
    { id: 1, user: "TFC_fan", text: "베르나르데스키 동점골 미쳤다 🔥" },
    { id: 2, user: "nash_sc", text: "아직 3분 남았다 집중!" },
    { id: 3, user: "mls_kr", text: "오늘 경기 진짜 재밌네요" },
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
