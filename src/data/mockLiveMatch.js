// src/data/mockLiveMatch.js
// 라이브 상세(/sport/match/:id) 목업 — 시안(라이브 상세.pdf) 기준
// - 실제 라이브 데이터(라인업 · 기록 · 중계)는 무료 API 로 받기 어려워 우선 목업으로 구성
// - 선수 사진: public/images/sport/players/lineup/{photo} 를 넣으면 표시 → 없으면 [추가] 영문 이름(EN_NAME)으로 TheSportsDB 프로필 사진 → 그래도 없으면 등번호 원
// - 포메이션 좌표(x, y): 경기장 카드 안 % 위치 (x: 왼쪽→오른쪽, y: 위(상대 골문)→아래(우리 골문))

const PHOTO = `${import.meta.env.BASE_URL}images/sport/players/lineup/`;

// [추가] 선수 영문 이름 → TheSportsDB 에서 프로필 사진을 찾아옴 (라이브 상세 라인업)
// - 사진 파일(photo)이 없을 때만 찾음 · 그 경기 팀(토론토 FC · 내슈빌 SC) 선수만 고르므로 다른 사람 사진은 안 섞임
// - 못 찾은 선수는 등번호 원 그대로 → 실제 이름을 알면 아래 영문 이름만 고치면 됨
const EN_NAME = {
  // 토론토 FC
  "오스본": "Osborne", "베르나르데스키": "Federico Bernardeschi", "코스타": "Costa", "플로레스": "Deybi Flores",
  "피터슨": "Petersen", "케르": "Deandre Kerr", "로몰": "Rommel", "길핀": "Gilpin", "마르셀로": "Marcelo",
  "램지": "Ramsey", "길렌": "Gillen", "발로우": "Barlow", "아눈가": "Anunga", "라미레스": "Ramirez",
  "파웰": "Powell", "하데베": "Hadebe", "해글런드": "Haglund",
  // 내슈빌 SC
  "무이유": "Hany Mukhtar", "수르리지": "Sam Surridge", "라이언": "Ryan", "고도이": "Anibal Godoy",
  "마허": "Jack Maher", "팔라시오스": "Jeisson Palacios", "윌리스": "Joe Willis", "스트라우드": "Jared Stroud",
  "터너": "Turner", "호세이 키지마": "Hosei Kijima", "마르코비치": "Markovich", "알렉스 보노": "Alex Bono",
};
const p = (num, name, pos, x, y, photo) => ({ num, name, pos, x, y, photo: photo ? `${PHOTO}${photo}` : null, enName: EN_NAME[name] || "" });
const sub = (num, name, photo) => ({ num, name, photo: photo ? `${PHOTO}${photo}` : null, enName: EN_NAME[name] || "" });

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
    // [추가] 토론토: 시안 라인업 화면의 선수 사진 (public/images/sport/players/lineup/toronto-*.svg · 디자이너 SVG · 선발 toronto-{등번호} · 후보 toronto-sub-{등번호})
    toronto: {
      formation: "3-2-4",
      coach: "누넌",
      starters: [
        p(8, "오스본", "공격형 MF", 50, 14, "toronto-8.svg"),
        p(10, "베르나르데스키", "윙어", 32, 20, "toronto-10.svg"),
        p(7, "코스타", "윙어", 66, 20, "toronto-7.svg"),
        p(6, "플로레스", "중앙 MF", 24, 41, "toronto-6.svg"),
        p(5, "피터슨", "중앙 MF", 50, 39, "toronto-5.svg"),
        p(9, "케르", "스트라이커", 74, 41, "toronto-9.svg"),
        p(4, "로몰", "센터백", 41, 60, "toronto-4.svg"),
        p(2, "길핀", "센터백", 59, 60, "toronto-2.svg"),
        p(3, "마르셀로", "레프트백", 26, 66, "toronto-3.svg"),
        p(11, "램지", "라이트백", 75, 68, "toronto-11.svg"),
        p(1, "길렌", "골키퍼", 50, 82, "toronto-1.svg"),
      ],
      subs: [
        sub(16, "발로우", "toronto-sub-16.svg"), sub(14, "음보마 뎀", "toronto-sub-14.svg"), sub(27, "아눈가", "toronto-sub-27.svg"), sub(29, "라미레스", "toronto-sub-29.svg"),
        sub(2, "파웰", "toronto-sub-2.svg"), sub(15, "하데베", "toronto-sub-15.svg"), sub(4, "해글런드", "toronto-sub-4.svg"), sub(13, "로우로", "toronto-sub-13.svg"),
      ],
    },
    // [추가] 내슈빌: 후보 8명은 디자이너 SVG (nashville-sub-{등번호}.svg) · 선발은 영문 이름으로 TheSportsDB 사진 → 없으면 등번호
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
        sub(16, "바리보", "nashville-sub-16.svg"), sub(14, "스트라우드", "nashville-sub-14.svg"), sub(27, "터너", "nashville-sub-27.svg"), sub(29, "호세이 키지마", "nashville-sub-29.svg"),
        sub(2, "닐리스", "nashville-sub-2.svg"), sub(15, "마르코비치", "nashville-sub-15.svg"), sub(4, "헤프티", "nashville-sub-4.svg"), sub(13, "알렉스 보노", "nashville-sub-13.svg"),
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
  chat: [], // [수정] 예시 채팅 삭제 → 사용자가 입력한 채팅(Firestore)만 표시
};

// [수정] 토론토 선수 이름 → 맡은 포지션 (이름 대신 "등번호 + 포지션"으로 표시)
// - 선발: 포지션 그대로 (센터백 · 윙어 …) / 후보: 첫 번째 골키퍼 · 나머지 수비수 → 미드필더 → 공격수 순서
// - 사진(photo) · 등번호는 그대로 · 중계 탭 문구(골 · 교체)는 시안 그대로
{
  const parts = ["수비수", "미드필더", "공격수"];
  const t = LIVE_MATCH.lineups.toronto;
  t.starters = t.starters.map((pl) => ({ ...pl, name: pl.pos, enName: "" }));
  t.subs = t.subs.map((pl, i) => ({ ...pl, name: i === 0 ? "골키퍼" : parts[(i - 1) % parts.length], enName: "" }));
}

// 오른쪽 목록: 같은 시간 다른 라이브 경기 (원정팀 id 기준 "OO VS 토론토")
// [추가] 다른 예시 경기 홈팀 선수 사진 (구단에서 받은 프로필 사진 · public/images/sport/players/lineup/{팀id}-{등번호}.jpg)
// - 선수 이름 데이터는 아직 없어 이름은 포지션(예시 틀) 그대로 · 사진만 등번호 자리에 연결
// - starters: 선발 등번호 1 ~ 11 (liveMatchAdapter.js genericLineup 과 같은 번호)
// - subs: 후보 등번호 목록 → 사진 수만큼 후보가 늘어남 (사진이 없는 구단은 예시 8명)
// - keepers: 후보 중 골키퍼 유니폼 사진의 등번호 → 이름 자리에 "골키퍼" (나머지는 수비수 · 미드필더 · 공격수 순서)
const teamPhotos = (teamId, subNums, keepers = []) => ({
  starters: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => [n, `${PHOTO}${teamId}-${n}.jpg`])),
  subs: subNums.map((n) => ({ num: n, keeper: keepers.includes(n), photo: `${PHOTO}${teamId}-sub-${n}.jpg` })),
});

export const MOCK_TEAM_PHOTOS = {
  houston: teamPhotos("houston", [12, 14, 15, 16, 17, 18, 20, 21], [12]), // [수정] 후보 8명 (22 ~ 27번 뺌)
  orlando: teamPhotos("orlando", [12, 14, 15, 16]),
};

// [추가] 다른 예시 경기 홈팀 감독 (경기마다 그 팀 감독 · 2026 시즌 기준 · 대행은 "(대행)")
// - 원정(토론토)은 시안 경기와 같은 감독
export const MOCK_TEAM_COACHES = {
  houston: "벤 올슨",
  atlanta: "헤라르도 마르티노",
  "san-jose": "브루스 어리나",
  orlando: "마르틴 페렐만 (대행)",
  "kansas-city": "라파엘 비키",
  "red-bulls": "마이클 브래들리",
  columbus: "로랑 쿠르투아 (대행)",
};

export const LIVE_OTHER_MATCHES = [
  { id: "l1", homeId: "houston", minute: 22 },
  { id: "l2", homeId: "atlanta", minute: 22 },
  { id: "l3", homeId: "san-jose", minute: 22 },
  { id: "l4", homeId: "orlando", minute: 22 },
  { id: "l5", homeId: "kansas-city", minute: 22 },
  { id: "l6", homeId: "red-bulls", minute: 22 },
  { id: "l7", homeId: "columbus", minute: 22 },
];
