// 샘플 데이터 – 나중에 useMovieStore 등 실제 API 데이터로 교체하세요.
// poster 가 비어 있으면 회색 플레이스홀더가 표시됩니다.

export const heroData = {
  label: 'Apple TV',
  title: '오직 Apple TV에서 만나는 이야기',
  desc: '수상작부터 화제의 신작까지, 광고 없이 언제 어디서나 감상하세요.',
  cta: { label: '로그인하고 시작하기', to: '/login' },
  sub: { label: '인기 작품 보기', to: '#top10' },
  note: '언제든 해지할 수 있어요.',
  image: '',
};

export const infoItems = [
  { id: 1, title: '광고 없는 시청', desc: '정주행도 끊김 없이' },
  { id: 2, title: '가족과 함께', desc: '최대 6명까지 공유' },
  { id: 3, title: '4K HDR 화질', desc: '돌비 비전·애트모스 지원' },
];

export const top10Items = [
  '경계의 밤', '마지막 항해', '서울 이후', '푸른 정원', '붉은 계절',
  '일곱 번째 문', '안개 도시', '여름의 끝', '새벽 두 시', '긴 겨울',
].map((title, i) => ({ id: i + 1, title, poster: '' }));

export const upcomingItems = [
  {
    id: 101,
    caption: '10월 공개 예정',
    title: '유리 바다',
    desc: '사라진 배를 쫓는 해양 미스터리',
    poster: '',
  },
  {
    id: 102,
    caption: '11월 공개 예정',
    title: '두 번째 지도',
    desc: '낡은 지도 한 장에서 시작되는 모험',
    poster: '',
  },
];

export const originalsItems = [
  { id: 201, title: '잿빛 항구', line1: '스릴러 · 시리즈', line2: '항구 도시에서 벌어진 연쇄 실종', meta: '시즌 1 · 10부작', poster: '' },
  { id: 202, title: '별을 세는 법', line1: '드라마 · 시리즈', line2: '작은 천문대에 모인 사람들의 이야기', meta: '시즌 2 · 8부작', poster: '' },
  { id: 203, title: '나무 위의 집', line1: '가족 · 영화', line2: '낡은 집에서 찾은 오래된 약속', meta: '러닝타임 1시간 52분', poster: '' },
  { id: 204, title: '오후의 증인', line1: '법정 · 시리즈', line2: '단 하루, 하나의 사건', meta: '시즌 1 · 6부작', poster: '' },
];

export const promoData = {
  title: 'AI가 골라주는 오늘의 작품',
  desc1: '시청 기록과 찜한 작품을 바탕으로',
  desc2: '지금 보기 좋은 작품을 추천해 드려요.',
  card: {
    title: '취향을 알려주세요',
    desc: '좋아하는 장르를 고르면 바로 추천해요.',
    note: '로그인 후 이용할 수 있어요.',
    cta: { label: '로그인하고 추천 받기', to: '/login' },
  },
};

export const deviceGuide = {
  title: ['Apple TV, 앱, Apple TV 4K.', '이름은 비슷해도 역할은 달라요.'],
  desc: '헷갈리기 쉬운 세 가지를 한 번에 정리했어요.',
  points: [
    '구독 서비스 — Apple Originals 시청',
    'Apple TV 앱 — 작품 화면에서 콘텐츠 이용',
    'Apple TV 4K — TV에 연결하는 스트리밍 기기',
  ],
  links: [
    { label: '세 가지 차이 보기', to: '/' },
    { label: '내 기기에서 보는 방법', to: '/' },
  ],
};
