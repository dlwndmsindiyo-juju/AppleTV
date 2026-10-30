// src/data/matchesData.js
// MLS 예정된 경기 데이터 (경기 이미지 포함) — 스포츠 "예정된 경기" 섹션용
// - homeId / awayId : src/data/sportTeams.js 의 구단 id (엠블럼 · 대표색 · 영문 이름은 getTeamById 로 가져오기)
// - homeTeam / awayTeam : 화면에 그대로 쓰는 한글 이름
// - kickoff : 경기 시작 시각 (한국 시간 · 시연용 임의 일정) → 카드 날짜 · 상세 카운트다운
// - image : 경기 카드 이미지 (public/images/matches/cards/{번호}-{홈}-vs-{원정}.jpg · 680 × 442)
//           아직 이미지가 없으면 null → 화면에서 두 구단 대표색 · 엠블럼으로 대체
// - 새 경기 추가: 이미지를 같은 규칙의 파일명으로 cards 폴더에 넣고 아래에 한 줄 추가
import { getTeamById } from "./sportTeams";

const card = (file) => `${import.meta.env.BASE_URL}images/matches/cards/${file}`;

export const mlsMatches = [
  { id: 1, homeId: "houston", awayId: "st-louis", homeTeam: "휴스턴 다이나모 FC", awayTeam: "세인트루이스 시티 SC", kickoff: "2026-11-08T06:00:00+09:00", image: card("01-houston-vs-st-louis.jpg") },
  { id: 2, homeId: "colorado", awayId: "chicago", homeTeam: "콜로라도 레피즈", awayTeam: "시카고 파이어 FC", kickoff: "2026-11-08T10:00:00+09:00", image: card("02-colorado-vs-chicago.jpg") },
  { id: 3, homeId: "red-bulls", awayId: "atlanta", homeTeam: "뉴욕 레드불스", awayTeam: "아틀란타 유나이티드 FC", kickoff: "2026-11-09T03:00:00+09:00", image: card("03-red-bulls-vs-atlanta.jpg") },
  { id: 4, homeId: "new-england", awayId: "miami", homeTeam: "뉴잉글랜드 레볼루션", awayTeam: "인터 마이애미 CF", kickoff: "2026-11-09T06:30:00+09:00", image: card("04-new-england-vs-miami.jpg") },
  { id: 5, homeId: "nashville", awayId: "red-bulls", homeTeam: "내슈빌 SC", awayTeam: "뉴욕 레드불스", kickoff: "2026-11-10T06:00:00+09:00", image: card("05-nashville-vs-red-bulls.jpg") },
  { id: 6, homeId: "seattle", awayId: "lafc", homeTeam: "시애틀 사운더스 FC", awayTeam: "LAFC", kickoff: "2026-11-10T10:00:00+09:00", image: card("06-seattle-vs-lafc.jpg") },
  { id: 7, homeId: "miami", awayId: "charlotte", homeTeam: "인터 마이애미 CF", awayTeam: "샬럿 FC", kickoff: "2026-11-11T03:00:00+09:00", image: card("07-miami-vs-charlotte.jpg") },
  { id: 8, homeId: "philadelphia", awayId: "toronto", homeTeam: "필라델피아 유니온", awayTeam: "토론토 FC", kickoff: "2026-11-11T06:30:00+09:00", image: card("08-philadelphia-vs-toronto.jpg") },
  { id: 9, homeId: "lafc", awayId: "minnesota", homeTeam: "LAFC", awayTeam: "미네소타 유나이티드 FC", kickoff: "2026-11-12T06:00:00+09:00", image: card("09-lafc-vs-minnesota.jpg") },
  { id: 10, homeId: "orlando", awayId: "new-england", homeTeam: "올랜도 시티 SC", awayTeam: "뉴잉글랜드 레볼루션", kickoff: "2026-11-12T10:00:00+09:00", image: card("10-orlando-vs-new-england.jpg") },
  { id: 11, homeId: "nycfc", awayId: "montreal", homeTeam: "뉴욕 시티 FC", awayTeam: "CF 몽레알", kickoff: "2026-11-13T03:00:00+09:00", image: card("11-nycfc-vs-montreal.jpg") },
  { id: 12, homeId: "montreal", awayId: "vancouver", homeTeam: "CF 몽레알", awayTeam: "밴쿠버 화이트캡스 FC", kickoff: "2026-11-13T06:30:00+09:00", image: card("12-montreal-vs-vancouver.jpg") },
  { id: 13, homeId: "portland", awayId: "houston", homeTeam: "포틀랜드 팀버스", awayTeam: "휴스턴 다이나모 FC", kickoff: "2026-11-14T06:00:00+09:00", image: card("13-portland-vs-houston.jpg") },
  { id: 14, homeId: "vancouver", awayId: "seattle", homeTeam: "밴쿠버 화이트캡스 FC", awayTeam: "시애틀 사운더스 FC", kickoff: "2026-11-14T10:00:00+09:00", image: card("14-vancouver-vs-seattle.jpg") },
  { id: 15, homeId: "columbus", awayId: "dc", homeTeam: "콜럼버스 크루", awayTeam: "D.C. 유나이티드", kickoff: "2026-11-15T03:00:00+09:00", image: card("15-columbus-vs-dc.jpg") },
  { id: 16, homeId: "st-louis", awayId: "san-diego", homeTeam: "세인트루이스 시티 SC", awayTeam: "샌디에이고 FC", kickoff: "2026-11-15T06:30:00+09:00", image: card("16-st-louis-vs-san-diego.jpg") },
  { id: 17, homeId: "charlotte", awayId: "orlando", homeTeam: "샬럿 FC", awayTeam: "올랜도 시티 SC", kickoff: "2026-11-16T06:00:00+09:00", image: card("17-charlotte-vs-orlando.jpg") },
  { id: 18, homeId: "la-galaxy", awayId: "austin", homeTeam: "LA 갤럭시", awayTeam: "오스틴 FC", kickoff: "2026-11-16T10:00:00+09:00", image: card("18-la-galaxy-vs-austin.jpg") },
  { id: 19, homeId: "kansas-city", awayId: "dallas", homeTeam: "스포팅 캔자스시티", awayTeam: "FC 댈러스", kickoff: "2026-11-17T03:00:00+09:00", image: card("19-kansas-city-vs-dallas.jpg") },
  { id: 20, homeId: "cincinnati", awayId: "philadelphia", homeTeam: "FC 신시내티", awayTeam: "필라델피아 유니온", kickoff: "2026-11-17T06:30:00+09:00", image: card("20-cincinnati-vs-philadelphia.jpg") },
  { id: 21, homeId: "san-diego", awayId: "kansas-city", homeTeam: "샌디에이고 FC", awayTeam: "스포팅 캔자스시티", kickoff: "2026-11-18T06:00:00+09:00", image: card("21-san-diego-vs-kansas-city.jpg") },
  { id: 22, homeId: "chicago", awayId: "columbus", homeTeam: "시카고 파이어 FC", awayTeam: "콜럼버스 크루", kickoff: "2026-11-18T10:00:00+09:00", image: card("22-chicago-vs-columbus.jpg") },
  { id: 23, homeId: "san-jose", awayId: "salt-lake", homeTeam: "새너제이 어스퀘이크스", awayTeam: "레알 솔트레이크", kickoff: "2026-11-19T03:00:00+09:00", image: card("23-san-jose-vs-salt-lake.jpg") },
  { id: 24, homeId: "atlanta", awayId: "toronto", homeTeam: "아틀란타 유나이티드 FC", awayTeam: "토론토 FC", kickoff: "2026-11-19T06:30:00+09:00", image: card("24-atlanta-vs-toronto.jpg") },
  { id: 25, homeId: "dc", awayId: "nycfc", homeTeam: "D.C. 유나이티드", awayTeam: "뉴욕 시티 FC", kickoff: "2026-11-20T06:00:00+09:00", image: card("25-dc-vs-nycfc.jpg") },
  // TODO: 남은 5경기 (id 26 ~ 30) — 이미지와 함께 추가
];

// 카드 · 목록에 쓰는 짧은 구단 이름 (sportTeams 의 shortName · 뉴욕 두 팀은 구분)
const SHORT_NAME = { nycfc: "뉴욕", "red-bulls": "레드불스" };
export const teamShortName = (id) => SHORT_NAME[id] || getTeamById(id)?.shortName || "";

// "뉴욕 vs. 애틀랜타"
export const matchTitle = (match) => `${teamShortName(match.homeId)} vs. ${teamShortName(match.awayId)}`;

// "11월 8일 · 오전 6:00" (withWeekday: "11월 8일 일요일 · 오전 6:00") · 한국 시간 기준
export const kickoffText = (value, withWeekday = false) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", ...(withWeekday && { weekday: "long" }) });
  const time = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
};

// 가까운 경기 순서 (지금 이후 경기 먼저 · 이미 지난 경기는 뒤로)
export const upcomingMatches = (now = Date.now()) => {
  const time = (m) => new Date(m.kickoff).getTime();
  const next = mlsMatches.filter((m) => time(m) >= now).sort((a, b) => time(a) - time(b));
  const past = mlsMatches.filter((m) => time(m) < now).sort((a, b) => time(a) - time(b));
  return [...next, ...past];
};

// 경기 하나 + 두 구단 정보 (엠블럼 · 색) 붙여서 가져오기
export const getMatchById = (id) => {
  const match = mlsMatches.find((m) => m.id === Number(id));
  if (!match) return undefined;
  return { ...match, home: getTeamById(match.homeId), away: getTeamById(match.awayId) };
};
