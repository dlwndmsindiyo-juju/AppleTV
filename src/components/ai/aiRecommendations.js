import poster0 from "./assets/poster0.jpg";
import poster1 from "./assets/poster1.jpg";
import poster2 from "./assets/poster2.jpg";
import poster3 from "./assets/poster3.jpg";
import poster4 from "./assets/poster4.jpg";
import poster5 from "./assets/poster5.jpg";

export const GENRES = ["코미디", "호러", "로맨스", "스릴러", "SF", "애니메이션"];
export const MOODS = ["가볍게 웃고 싶어요", "긴장감 넘치는", "따뜻한 감동", "몰입감 있는"];
export const DURATIONS = ["30분 이하", "1시간 내외", "영화 한 편", "상관없어요"];

// Figma 원본 포스터를 사용하는 UI 예시 데이터. 실제 AI/개인화 결과가 아닙니다.
// API 연결 시 onRecommend(preferences, { signal, page }) -> Promise<작품[]> 로 교체하세요.
const EXAMPLES = [
  { id: 87917, title: "포 올 맨카인드", genre: "SF", genres: ["SF"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster0, overview: "치열한 우주 경쟁이 끝나지 않은 세상. 우주 비행사와 가족들의 위태로운 삶을 따라가는 이야기." },
  { id: 93740, title: "파운데이션", genre: "SF", genres: ["SF"], moods: ["몰입감 있는"], duration: "1시간 내외", poster: poster1, overview: "은하 제국의 몰락 앞에서 인류의 미래를 지키려는 이들의 장대한 여정." },
  { id: "pluribus", title: "플루리부스", genre: "SF · 드라마", genres: ["SF"], moods: ["긴장감 넘치는"], duration: "1시간 내외", poster: poster2, overview: "모두가 행복해진 세상에서 홀로 다른 감정을 느끼는 한 사람의 이야기." },
  { id: 91363, title: "모나크: 레거시 오브 몬스터즈", genre: "SF · 어드벤처", genres: ["SF", "스릴러"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster3, overview: "괴수의 존재가 드러난 세상. 가족의 비밀과 모나크의 숨겨진 역사를 추적한다." },
  { id: 80752, title: "어둠의 나날", genre: "SF · 드라마", genres: ["SF", "스릴러"], moods: ["긴장감 넘치는"], duration: "1시간 내외", poster: poster4, overview: "시력을 잃은 인류의 세상에 새로운 가능성이 태어나고, 가족을 지키기 위한 여정이 시작된다." },
  { id: 196322, title: "다크 매터", genre: "SF · 스릴러", genres: ["SF", "스릴러", "로맨스"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster5, overview: "다른 삶으로 옮겨진 한 남자가 사랑하는 가족과 자신의 현실을 되찾으려 한다." },
];

export function getExampleRecommendations(preferences, { page = 0 } = {}) {
  const score = (item) => preferences.genres.filter((g) => item.genres.includes(g)).length * 3
    + Number(item.moods.includes(preferences.mood)) * 2 + Number(item.duration === preferences.duration);
  const sorted = [...EXAMPLES].sort((a, b) => score(b) - score(a));
  const offset = page % sorted.length;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}
