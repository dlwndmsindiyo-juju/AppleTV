// Apple TV 에코시스템 비교 페이지 데이터 (pages/Ecosystem.jsx)
// 이미지: public/images/ecosystem/*.png

const IMG = `${import.meta.env.BASE_URL}images/ecosystem/`;

// =====================================================================
// 🔗 공식 링크 — 여기만 채우면 버튼에 연결돼요 (비워두면 버튼 비활성)
// =====================================================================
export const ECOSYSTEM_LINKS = {
  appPlan: "", // Apple TV App 구독 플랜 보기
  tvPlan: "", // Apple TV 구독 플랜 보기
  tv4kPlan: "", // Apple TV 4K 구독 플랜 보기
  devices: "", // 내 기기에서 보는 방법
};

// 카드마다 같은 순서로 보여줄 항목
export const ECOSYSTEM_ROWS = [
  { key: "what", label: "무엇인가요?" },
  { key: "where", label: "어디서 쓰나요?" },
  { key: "value", label: "핵심 가치" },
  { key: "who", label: "누구에게?" },
  { key: "how", label: "이용 방법" },
  { key: "limit", label: "이용 범위 / 제한" },
];

export const ECOSYSTEM_PRODUCTS = [
  {
    id: "app",
    name: "Apple TV app",
    category: "앱 / 플랫폼",
    desc: ["다양한 콘텐츠를 한곳에서", "탐색하고 시청하는 앱."],
    image: `${IMG}tvapp.svg`,
    imageAlt: "iPad와 iPhone에서 실행 중인 Apple TV 앱",
    rows: {
      what: "Apple TV와 지원되는 외부 서비스의 콘텐츠를 탐색하는 시청 허브.",
      where: "iPhone, iPad, Mac, 스마트 TV 등 지원 기기.",
      value: "콘텐츠 탐색, 이어보기, 맞춤 추천.",
      who: "여러 기기에서 콘텐츠를 찾아보고 싶은 사용자.",
      how: "기기에서 앱을 열거나 설치한 뒤 Apple 계정으로 로그인.",
      limit: "앱 사용과 콘텐츠 구독은 별개입니다. 타사 서비스·대여·구입은 별도 결제될 수 있습니다.",
    },
    button: { label: "Apple TV App 구독 플랜 보기", linkKey: "appPlan" },
    note: "앱 설치 자체를 결제하는 버튼이 아닙니다.",
  },
  {
    id: "tv",
    name: "Apple TV",
    category: "구독 서비스",
    desc: ["Apple이 만드는 오리지널을", "즐기는 스트리밍 서비스."],
    image: `${IMG}tvos.svg`,
    imageAlt: "TV 화면에 표시된 Apple TV 홈 화면",
    rows: {
      what: "Apple Original 영화와 시리즈를 제공하는 구독 서비스.",
      where: "Apple TV 앱 또는 웹 브라우저의 tv.apple.com.",
      value: "독점 시리즈, 영화, 다큐멘터리, 키즈 콘텐츠.",
      who: "Apple Original을 보고 싶은 사용자.",
      how: "Apple 계정으로 로그인하고 이용 가능한 플랜 선택.",
      limit: "타사 OTT 구독, 별도 대여·구입 콘텐츠와 Apple TV 4K 기기는 포함되지 않습니다.",
    },
    button: { label: "Apple TV 구독 플랜 보기", linkKey: "tvPlan" },
    note: "로그인 후 이용 가능한 혜택을 확인하세요.",
  },
  {
    id: "4k",
    name: "Apple TV 4K",
    category: "하드웨어",
    desc: ["TV에 연결해 더 큰 화면에서", "즐기는 스트리밍 기기."],
    image: `${IMG}tv4k.svg`,
    imageAlt: "Apple TV 4K 본체와 Siri Remote",
    rows: {
      what: "TV의 HDMI에 연결하는 Apple의 스트리밍 기기.",
      where: "거실 TV · 인터넷 연결과 호환 TV 필요.",
      value: "지원 콘텐츠의 4K HDR, Dolby Atmos와 Apple 기기 연동.",
      who: "집의 TV에서 여러 앱과 콘텐츠를 즐기고 싶은 사용자.",
      how: "기기를 별도 구입하고 TV에 연결한 뒤 Apple 계정으로 로그인.",
      limit: "기기 구매가 모든 구독을 포함하지 않습니다. 콘텐츠·TV·오디오 장비별 지원 조건이 다릅니다.",
    },
    button: { label: "Apple TV 4K 구독 플랜 보기", linkKey: "tv4kPlan" },
    note: "기기 구매는 구독과 별도로 진행합니다.",
  },
];

// 하단: 지원 기기
export const ECOSYSTEM_DEVICES = ["iPhone", "iPad", "Mac", "Apple TV 4K", "스마트 TV"];
