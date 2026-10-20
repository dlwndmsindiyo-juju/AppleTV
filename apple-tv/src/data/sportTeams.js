// MLS 구단 데이터 (public/images/sport-team/*.svg)
// - id: 구독 저장용 고유값 (localStorage 에 저장되므로 바꾸지 않기)
// - shortName: 카드에 표시할 짧은 이름 / name: 전체 이름 (접근성 라벨)
// - conference: "east" | "west"

const BASE = `${import.meta.env.BASE_URL}images/sport-team/`;
const logo = (file) => `${BASE}${file}`;

export const CONFERENCES = {
  east: "동부 컨퍼런스",
  west: "서부 컨퍼런스",
};

export const SPORT_TEAMS = [
  // ===== 동부 컨퍼런스 =====
  { id: "atlanta", shortName: "애틀랜타", name: "애틀랜타 유나이티드", enName: "Atlanta United", conference: "east", logo: logo("atlanta-chip.svg") },
  { id: "charlotte", shortName: "샬럿", name: "샬럿 FC", enName: "Charlotte FC", conference: "east", logo: logo("charlotte-chip.svg") },
  { id: "chicago", shortName: "시카고", name: "시카고 파이어", enName: "Chicago Fire", conference: "east", logo: logo("chicago-chip.svg") },
  { id: "cincinnati", shortName: "신시내티", name: "FC 신시내티", enName: "FC Cincinnati", conference: "east", logo: logo("cincinnati-chip.svg") },
  { id: "columbus", shortName: "콜럼버스", name: "콜럼버스 크루", enName: "Columbus Crew", conference: "east", logo: logo("columbus-chip.svg") },
  { id: "dc", shortName: "DC", name: "DC 유나이티드", enName: "D.C. United", conference: "east", logo: logo("DC-chip.svg") },
  { id: "miami", shortName: "마이애미", name: "인터 마이애미", enName: "Inter Miami", conference: "east", logo: logo("miami-chip.svg") },
  { id: "montreal", shortName: "몽레알", name: "CF 몽레알", enName: "CF Montréal", conference: "east", logo: logo("montreal-chip.svg") },
  { id: "nashville", shortName: "내슈빌", name: "내슈빌 SC", enName: "Nashville SC", conference: "east", logo: logo("nashville-chip.svg") },
  { id: "new-england", shortName: "뉴잉글랜드", name: "뉴잉글랜드 레볼루션", enName: "New England Revolution", conference: "east", logo: logo("newEngland-chip.svg") },
  { id: "nycfc", shortName: "뉴욕 시티", name: "뉴욕 시티 FC", enName: "New York City FC", conference: "east", logo: logo("NewYorkCity-chip.svg") },
  { id: "red-bulls", shortName: "레드불스", name: "뉴욕 레드불스", enName: "New York Red Bulls", conference: "east", logo: logo("redbull-chip.svg") },
  { id: "orlando", shortName: "올랜도", name: "올랜도 시티", enName: "Orlando City", conference: "east", logo: logo("orlando-chip.svg") },
  { id: "philadelphia", shortName: "필라델피아", name: "필라델피아 유니언", enName: "Philadelphia Union", conference: "east", logo: logo("philadelphia-chip.svg") },
  { id: "toronto", shortName: "토론토", name: "토론토 FC", enName: "Toronto FC", conference: "east", logo: logo("toronto-chip.svg") },

  // ===== 서부 컨퍼런스 =====
  { id: "austin", shortName: "오스틴", name: "오스틴 FC", enName: "Austin FC", conference: "west", logo: logo("austin-chip.svg") },
  { id: "colorado", shortName: "콜로라도", name: "콜로라도 래피즈", enName: "Colorado Rapids", conference: "west", logo: logo("colorado-chip.svg") },
  { id: "dallas", shortName: "댈러스", name: "FC 댈러스", enName: "FC Dallas", conference: "west", logo: logo("dallas-chip.svg") },
  { id: "houston", shortName: "휴스턴", name: "휴스턴 다이너모", enName: "Houston Dynamo", conference: "west", logo: logo("houston-chip.svg") },
  { id: "kansas-city", shortName: "캔자스시티", name: "스포팅 캔자스시티", enName: "Sporting Kansas City", conference: "west", logo: logo("kansasCity-chip.svg") },
  { id: "la-galaxy", shortName: "LA 갤럭시", name: "LA 갤럭시", enName: "LA Galaxy", conference: "west", logo: logo("LA-chip.svg") },
  { id: "lafc", shortName: "LAFC", name: "LAFC", enName: "Los Angeles FC", conference: "west", logo: logo("LAFC-chip.svg") },
  { id: "minnesota", shortName: "미네소타", name: "미네소타 유나이티드", enName: "Minnesota United", conference: "west", logo: logo("minnesota-chip.svg") },
  { id: "portland", shortName: "포틀랜드", name: "포틀랜드 팀버스", enName: "Portland Timbers", conference: "west", logo: logo("portland-chip.svg") },
  { id: "salt-lake", shortName: "솔트레이크", name: "레알 솔트레이크", enName: "Real Salt Lake", conference: "west", logo: logo("saltLake-chip.svg") },
  { id: "san-diego", shortName: "샌디에이고", name: "샌디에이고 FC", enName: "San Diego FC", conference: "west", logo: logo("sanDiego-chip.svg") },
  { id: "san-jose", shortName: "산호세", name: "산호세 어스퀘이크스", enName: "San Jose Earthquakes", conference: "west", logo: logo("sanjose-chip.svg") },
  { id: "seattle", shortName: "시애틀", name: "시애틀 사운더스", enName: "Seattle Sounders", conference: "west", logo: logo("seattle-chip.svg") },
  { id: "st-louis", shortName: "세인트루이스", name: "세인트루이스 시티 SC", enName: "St. Louis City SC", conference: "west", logo: logo("STlouis-chip.svg") },
  { id: "vancouver", shortName: "밴쿠버", name: "밴쿠버 화이트캡스", enName: "Vancouver Whitecaps", conference: "west", logo: logo("vancouver-chip.svg") },
];
