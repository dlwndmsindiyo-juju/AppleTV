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
// thumbVideoId: 카드 썸네일로 쓸 YouTube 영상 ID (youtube.com/watch?v=○○○ 의 ○○○ · 11글자)
//   → 썸네일: https://i.ytimg.com/vi/{thumbVideoId}/hqdefault.jpg (API 키 불필요)
//   → 상세에서는 이 영상부터 재생하고, 이어서 같은 재생목록이 재생됨
// cover: 직접 넣을 썸네일 이미지 경로 (public/images/... · thumbVideoId 보다 우선)
// 둘 다 없으면 리그 이름 + 국가 글자 카드로 표시 (국기 이모지는 Windows 브라우저에서 글자로 보여서 쓰지 않음)


// 채널 ID → 인기 영상 재생목록 ID
const popularOf = (channelId) =>
  `UULP${channelId.slice(2)}`;

export const REPLAY_LEAGUES = [
  {
    id: "inter-miami",
    league: "인터 마이애미 CF",
    leagueEn: "Inter Miami CF",
    channel: "Inter Miami CF",
    channelId: "UCcFuqX01k0dCBULXl1YvCsA",
    playlistId: popularOf("UCcFuqX01k0dCBULXl1YvCsA"),
    thumbVideoId: "xHocLJcBsIA",
    cover: "",
    desc: "인터 마이애미 CF의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "lafc",
    league: "LAFC",
    leagueEn: "Los Angeles FC",
    channel: "Los Angeles Football Club",
    channelId: "UCnqj91wjXAT0bsmxF1fHWBA",
    playlistId: popularOf("UCnqj91wjXAT0bsmxF1fHWBA"),
    thumbVideoId: "JIHjOKrlT5M",
    cover: "",
    desc: "LAFC의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "seattle",
    league: "시애틀 사운더스",
    leagueEn: "Seattle Sounders FC",
    channel: "Seattle Sounders FC",
    channelId: "UCVhbRUhe_hfmgi-UN1gcQzw",
    playlistId: popularOf("UCVhbRUhe_hfmgi-UN1gcQzw"),
    thumbVideoId: "ObZVcMYxWXQ",
    cover: "",
    desc: "시애틀 사운더스의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "atlanta",
    league: "애틀랜타 유나이티드",
    leagueEn: "Atlanta United FC",
    channel: "Atlanta United FC",
    channelId: "UC8fg8L4X7qpQdHJgxpM4qxw",
    playlistId: popularOf("UC8fg8L4X7qpQdHJgxpM4qxw"),
    thumbVideoId: "LVI7w1EQ8Vw",
    cover: "",
    desc: "애틀랜타 유나이티드의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "portland",
    league: "포틀랜드 팀버스",
    leagueEn: "Portland Timbers",
    channel: "Portland Timbers",
    channelId: "UCm0KnY18KTa_h9bcm3aFEBw",
    playlistId: popularOf("UCm0KnY18KTa_h9bcm3aFEBw"),
    thumbVideoId: "eqL7LIu7qEI",
    cover: "",
    desc: "포틀랜드 팀버스의 주요 경기 및 하이라이트 영상 모음",
  },
   {
    id: "cincinnati",
    league: "FC 신시내티",
    leagueEn: "FC Cincinnati",
    channel: "FC Cincinnati",
    channelId: "UCqT7uS7skbqqNrn5LCCozMg",
    playlistId: popularOf("UCqT7uS7skbqqNrn5LCCozMg"),
    thumbVideoId: "AoynogdDJcY",
    cover: "",
    desc: "FC 신시내티의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "vancouver",
    league: "밴쿠버 화이트캡스",
    leagueEn: "Vancouver Whitecaps FC",
    channel: "Vancouver Whitecaps FC",
    channelId: "UCJ_qxVONy87ISlB2sYwIlvA",
    playlistId: popularOf("UCJ_qxVONy87ISlB2sYwIlvA"),
    thumbVideoId: "IPAWNabEZWY",
    cover: "",
    desc: "밴쿠버 화이트캡스의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "columbus",
    league: "콜럼버스 크루",
    leagueEn: "Columbus Crew",
    channel: "Columbus Crew",
    channelId: "UCWaD_J0qRubgPr9DV_x9-Jw",
    playlistId: popularOf("UCWaD_J0qRubgPr9DV_x9-Jw"),
    thumbVideoId: "-RZRAyK_NZI",
    cover: "",
    desc: "콜럼버스 크루의 주요 경기 및 하이라이트 영상 모음",
  },
  {
    id: "san-diego",
    league: "샌디에이고 FC",
    leagueEn: "San Diego FC",
    channel: "San Diego FC",
    channelId: "UCOJ8WBGCN2kxectMgoypybg",
    playlistId: popularOf("UCOJ8WBGCN2kxectMgoypybg"),
    thumbVideoId: "MXb-3HIHj24",
    cover: "",
    desc: "샌디에이고 FC의 주요 경기 및 하이라이트 영상 모음",
  },
];

// 기존 썸네일 함수 유지
export const leagueThumb = (league) =>
  league.cover ||
  (league.thumbVideoId
    ? `https://i.ytimg.com/vi/${league.thumbVideoId}/hqdefault.jpg`
    : "");

// 기존 YouTube 재생목록 iframe 주소 유지
export const playlistEmbedUrl = (
  playlistId,
  firstVideoId = ""
) =>
  firstVideoId
    ? `https://www.youtube.com/embed/${firstVideoId}?list=${playlistId}&autoplay=1&rel=0&playsinline=1`
    : `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0&playsinline=1`;

// 기존 YouTube 재생목록 이동 주소 유지
export const playlistWatchUrl = (playlistId) =>
  `https://www.youtube.com/playlist?list=${playlistId}`;
