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
    id: "short-06",
    youtubeUrl: "https://youtube.com/shorts/1dcrNIJ5ndY?si=-ltv1g9MQaZxm2je",
    thumb: `${THUMB_BASE}short-06.png`,
    tag: "LAFC",
    title: "차원이 다른 속도감",
    match: "LAFC vs ATX",
    likeCount: 5200,
  },
  {
    id: "short-01",
    youtubeUrl: "https://youtube.com/shorts/_n56jT1AdhI?si=0b502gOD16L4veem",
    thumb: `${THUMB_BASE}short-01.png`,
    tag: "charlotte",
    title: "대니 무소프스키의 활약",
    match: "SEA vs QRO",
    likeCount: 143,
  },
  {
    id: "short-02",
    youtubeUrl: "https://youtube.com/shorts/lrRVpf6f0U8?si=OsNKId-uTom0U5sa",
    thumb: `${THUMB_BASE}short-02.png`,
    tag: "Dallas",
    title: "페타르 무사 완벽한 샷",
    match: "DAL vs MON",
    likeCount: 100,
  },
  {
    id: "short-03",
    youtubeUrl: "https://youtube.com/shorts/9ermfDRmok8?si=ehscq_xwYTG6Si0N",
    thumb: `${THUMB_BASE}short-03.png`,
    tag: "Naesyubil",
    title: "슈퍼 샘 결정적인 순간",
    match: "NSH vs RBNY",
    likeCount: 151,
  },
  {
    id: "short-04",
    youtubeUrl: "https://youtube.com/shorts/zDi7CIqLFxQ?si=Hxbba2o6h-knXy4R",
    thumb: `${THUMB_BASE}short-04.png`,
    tag: "RedBull",
    title: "수비벽을 뚫고 GOAL",
    match: "RBL vs SVW",
    likeCount: 468,
  },
  {
    id: "short-05",
    youtubeUrl: "https://youtube.com/shorts/dByLnYyGDE4?si=yADmTmTFKGd-7gLt",
    thumb: `${THUMB_BASE}short-05.png`,
    tag: "Atlanta",
    title: "카메라 보다 빠른 슈팅",
    match: "ATL vs TOR",
    likeCount: 50,
  },
  {
    id: "short-07",
    youtubeUrl: "https://youtube.com/shorts/Wk63XfbWa00?si=iAAm8pi5fVGpy9ex",
    thumb: `${THUMB_BASE}short-07.png`,
    tag: "Toronto",
    title: "한 번의 터치로 끝낸 골",
    match: "TOR vs DC",
    likeCount: 87,
  },
];

export const SPORT_SHORTS = SHORTS.map((item) => ({ ...item, videoId: youtubeIdOf(item.youtubeUrl) }));
