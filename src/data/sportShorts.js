// =====================================================================
// 스포츠 숏폼 데이터 (정해진 경기 영상만)
// - thumb: public/images/sport/shorts/ 에 있는 썸네일
// - youtubeUrl: 재생할 유튜브 영상 주소 (watch?v= · youtu.be/ · shorts/ · embed/ 모두 가능)
//   → videoId 는 주소에서 자동으로 뽑아요 / 비워 두면 재생 버튼이 숨겨지고 썸네일만 보여요
// - seconds: 영상 길이(초) → 재생 진행 바 / meta 의 길이 표시에 사용
// - likeCount: 좋아요 수 (12.8만 = 128000)
// =====================================================================

const THUMB_BASE = `${import.meta.env.BASE_URL}images/sport/shorts/`;

// 유튜브 주소 → 영상 id (11자리)
const youtubeIdOf = (url = "") => {
  const m = String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
};

const SHORTS = [
  {
    id: "short-01",
    youtubeUrl: "https://www.youtube.com/watch?v=UaRAgWDfKSE",
    thumb: `${THUMB_BASE}short-01.png`,
    tag: "HOU",
    title: "수비를 뚫는 환상 드리블",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-02",
    youtubeUrl: "https://www.youtube.com/watch?v=M5OHL4Z8BVc",
    thumb: `${THUMB_BASE}short-02.png`,
    tag: "HOU",
    title: "골보다 짜릿한 완벽 수비",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-03",
    youtubeUrl: "https://www.youtube.com/watch?v=yCgWnS6UiYk",
    thumb: `${THUMB_BASE}short-03.png`,
    tag: "HOU",
    title: "승부를 뒤집은 한 방",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-04",
    youtubeUrl: "https://www.youtube.com/watch?v=Tg0HkHQc0sw",
    thumb: `${THUMB_BASE}short-04.png`,
    tag: "HOU",
    title: "이걸 막아? 기적의 선방",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-05",
    youtubeUrl: "https://www.youtube.com/watch?v=TKB-WTgDXD0",
    thumb: `${THUMB_BASE}short-05.png`,
    tag: "HOU",
    title: "이 타이밍! 완벽한 헤딩",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-06",
    youtubeUrl: "https://www.youtube.com/watch?v=UaRAgWDfKSE",
    thumb: `${THUMB_BASE}short-06.png`,
    tag: "HOU",
    title: "골 넣고 텐션 폭발!",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
  {
    id: "short-07",
    youtubeUrl: "https://www.youtube.com/watch?v=M5OHL4Z8BVc",
    thumb: `${THUMB_BASE}short-07.png`,
    tag: "HOU",
    title: "한 번의 터치로 끝낸 골",
    match: "휴스턴 vs. 오스틴",
    seconds: 24,
    likeCount: 128000,
  },
];

export const SPORT_SHORTS = SHORTS.map((item) => ({ ...item, videoId: youtubeIdOf(item.youtubeUrl) }));
