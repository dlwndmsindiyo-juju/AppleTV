// src/data/replayLeagues.js
// 경기 다시보기 — 국가별 1부 리그 영상 모음집 (YouTube 재생목록 · API 키 불필요)
// - 각 리그 공식 YouTube 채널의 재생목록을 그대로 퍼가기(embed)로 재생
//   https://www.youtube.com/embed/videoseries?list={playlistId}
// - playlistId 를 직접 지정하므로 YouTube API 키 · 요청 한도 없이 항상 같은 모음집이 나옴
//
// playlistId 정하는 법 (채널 ID 가 UCxxxx 일 때)
//   "UULP" + 채널ID 3번째 글자부터  → 채널 인기 영상 모음 (자주 바뀌지 않음, 기본값)
//   "UULF" + 채널ID 3번째 글자부터  → 최신 일반 영상 모음 (숏츠 제외)
//   특정 시즌 하이라이트 재생목록을 쓰려면 youtube.com/playlist?list=PLxxxx 의 PLxxxx 를 그대로 넣기
//
// cover: 썸네일 이미지 경로 (public/images/... · 없으면 리그 이름 + 국가 글자 카드로 표시)
// (국기 이모지는 Windows 브라우저에서 글자로 보여서 쓰지 않음)

// 채널 ID → 인기 영상 모음 재생목록 ID
const popularOf = (channelId) => `UULP${channelId.slice(2)}`;

export const REPLAY_LEAGUES = [
  {
    id: "epl",
    country: "잉글랜드",
    league: "프리미어리그",
    leagueEn: "Premier League",
    channel: "Premier League",
    channelId: "UCG5qGWdu8nIRZqJ_GgDwQ-w",
    playlistId: popularOf("UCG5qGWdu8nIRZqJ_GgDwQ-w"),
    cover: "",
    desc: "잉글랜드 프리미어리그 공식 채널의 인기 경기 · 골 영상 모음",
  },
  {
    id: "laliga",
    country: "스페인",
    league: "라리가",
    leagueEn: "LALIGA EA SPORTS",
    channel: "LALIGA EA SPORTS",
    channelId: "UCTv-XvfzLX3i4IGWAm4sbmA",
    playlistId: popularOf("UCTv-XvfzLX3i4IGWAm4sbmA"),
    cover: "",
    desc: "스페인 라리가 공식 채널의 인기 경기 · 골 영상 모음",
  },
  {
    id: "bundesliga",
    country: "독일",
    league: "분데스리가",
    leagueEn: "Bundesliga",
    channel: "Bundesliga",
    channelId: "UC6UL29enLNe4mqwTfAyeNuw",
    playlistId: popularOf("UC6UL29enLNe4mqwTfAyeNuw"),
    cover: "",
    desc: "독일 분데스리가 공식 채널의 인기 경기 · 골 영상 모음",
  },
  {
    id: "seriea",
    country: "이탈리아",
    league: "세리에 A",
    leagueEn: "Serie A",
    channel: "Serie A",
    channelId: "UCBJeMCIeLQos7wacox4hmLQ",
    playlistId: popularOf("UCBJeMCIeLQos7wacox4hmLQ"),
    cover: "",
    desc: "이탈리아 세리에 A 공식 채널의 인기 경기 · 골 영상 모음",
  },
  {
    id: "mls",
    country: "미국",
    league: "MLS",
    leagueEn: "Major League Soccer",
    channel: "Major League Soccer",
    channelId: "UCSZbXT5TLLW_i-5W8FZpFsg",
    playlistId: popularOf("UCSZbXT5TLLW_i-5W8FZpFsg"),
    cover: "",
    desc: "미국 메이저리그 사커(MLS) 공식 채널의 인기 경기 · 골 영상 모음",
  },
  // 리그 추가 예시 (채널 ID 를 확인한 뒤 주석을 풀어 사용)
  // {
  //   id: "kleague",
  //   country: "대한민국",
  //   league: "K리그1",
  //   leagueEn: "K LEAGUE 1",
  //   channel: "K LEAGUE",
  //   channelId: "UC........................",
  //   playlistId: popularOf("UC........................"),
  //   cover: "",
  //   desc: "K리그 공식 채널의 인기 경기 · 골 영상 모음",
  // },
];

// 재생 주소 (퍼가기) · YouTube 에서 보기 주소
export const playlistEmbedUrl = (playlistId) =>
  `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0&playsinline=1`;
export const playlistWatchUrl = (playlistId) => `https://www.youtube.com/playlist?list=${playlistId}`;
