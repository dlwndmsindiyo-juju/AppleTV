import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import AiAssistantLink from "../ai/AiAssistantLink";
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenres } from "./useContentInfo";
import { useAuthStore } from "../../store/useAuthStore";
import { isResumable, useWatchConnect, useWatchStore } from "../../store/useWatchStore";
import MemberSectionHead from "./MemberSectionHead"; // [정리] 섹션 머리 공용

// AI 어시스트 — 시안: 기분 칩 → 안내 바(취향 더 반영하기) → 가로형 카드 4장 슬라이드
// - 작품: 기분별 Apple TV+ 시리즈 + 영화를 번갈아 섞음 (store/moodRecommendations.mjs)
// - 썸네일 안 문구: [수정] 모든 카드에 표시 — TMDB 소개 한 줄(tagline) → 없으면 MOOD_TAGLINES → 그래도 없으면 줄거리 첫 문장
// - 설명 줄: "{키워드 · 장르} · {시리즈|영화} · {Apple Original 또는 다른 장르}" (useContentInfo)
// - 링크: 시청 기록이 있으면 "이어보기"(멈춘 곳부터 재생 ?play=1), 없으면 "상세 보기"

// moodRecommendations의 기분 키와 동일하게 유지합니다.
const MOODS = ["심심한", "힘든", "슬픈", "즐거움", "화남"];

const normalizeMoodTitle = (title = "") =>
  title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

// 작품명으로 이미지를 연결합니다.
const MOOD_ARTWORK = [
  [1, ["슬로 호시스", "Slow Horses"]],
  [2, ["아카풀코", "Acapulco"]],
  [3, ["어둠의 나날", "See"]],
  [4, ["위도우스 베이의 저주", "위도우스 베이", "Widow’s Bay", "Widow's Bay"]],
  [5, ["인베이션", "Invasion"]],
  [6, ["저주에 걸린 가족을 구해라!", "저주에 걸린 가족을 구해라", "Curses!"]],
  [7, ["지미의 상담소", "Shrinking"]],
  [8, ["지하창고 사일로의 비밀", "사일로", "Silo"]],
  [
    9,
    [
      "카풀 노래방: 시리즈",
      "카풀 노래방",
      "Carpool Karaoke: The Series",
      "Carpool Karaoke",
    ],
  ],
  [10, ["케이프 피어", "Cape Fear"]],
  [11, ["크리미널 레코드", "Criminal Record"]],
  [12, ["테드 래소", "Ted Lasso"]],
  [13, ["파운데이션", "Foundation"]],
  [14, ["포 올 맨카인드", "For All Mankind"]],
  [
    15,
    [
      "프렌즈 & 네이버스",
      "프렌즈 앤 네이버스",
      "Your Friends & Neighbors",
      "Your Friends and Neighbors",
    ],
  ],
  [16, ["플라토닉", "Platonic"]],
  [17, ["30일의 밤", "Dark Matter"]],
  [18, ["그가 나에게 말하지 않은 것", "The Last Thing He Told Me"]],
  [19, ["더 스튜디오", "The Studio"]],
  [20, ["돈벼락", "Loot"]],
  [21, ["두 번째 스윙", "Stick"]],
  [22, ["마지막 흔적", "Last Seen"]],
  [23, ["머더봇 다이어리", "머더봇", "Murderbot"]],
  [
    24,
    [
      "모나크: 레거시 오브 몬스터즈",
      "모나크: 레거시 오브 몬스터",
      "Monarch: Legacy of Monsters",
    ],
  ],
  [25, ["모스키토 코스트", "The Mosquito Coast"]],
  [
    26,
    [
      "미틱 퀘스트",
      "Mythic Quest",
      "미틱 퀘스트: 레이븐스 뱅큇",
      "Mythic Quest: Raven's Banquet",
      "Mythic Quest: Raven's Banquet",
    ],
  ],
  [27, ["세브란스: 단절", "세브란스", "Severance"]],
  [28, ["나쁜 원숭이", "Bad Monkey"]],
  [29, ["럭키", "Lucky"]],
  [30, ["플루리부스: 행복의 시대", "플루리부스", "Pluribus"]],
  [31, ["브라더스", "Brothers"]],
];

const MOOD_ARTWORK_BY_TITLE = new Map(
  MOOD_ARTWORK.flatMap(([number, titles]) =>
    titles.map((title) => [
      normalizeMoodTitle(title),
      `/images/AI-popup/AI_pop_up${number}.png`,
    ]),
  ),
);

// [추가] TMDB 에 한국어 소개 한 줄(tagline)이 없는 작품용 문구 — 영문 원제 기준
const MOOD_TAGLINES = Object.fromEntries(
  Object.entries({
    // 시리즈
    "Silo": "지하 144층, 진실은 바깥에 있다.",
    "Dark Matter": "선택하지 않은 삶이 문을 두드린다.",
    "Severance": "회사의 나와 집의 나, 기억이 나뉘었다.",
    "Foundation": "무너지는 제국, 인류를 구할 계획.",
    "Slow Horses": "낙오자 요원들의 반격이 시작된다.",
    "Murderbot": "사람은 싫지만 지켜야 하는 경비 로봇.",
    "Ted Lasso": "축구는 몰라도 사람은 믿는 감독.",
    "Shrinking": "상처 입은 상담사의 솔직한 처방.",
    "Acapulco": "꿈의 리조트에서 시작된 인생 역전.",
    "Loot": "억만장자, 진짜 하고 싶은 일을 찾다.",
    "Stick": "한물간 골프 선수, 천재 소년을 만나다.",
    "Platonic": "다시 만난 오랜 친구, 다시 시작된 소동.",
    "The Studio": "할리우드 스튜디오 수장의 좌충우돌.",
    "Mythic Quest": "게임보다 더 시끄러운 개발 스튜디오.",
    "Carpool Karaoke: The Series": "차 안에서 펼쳐지는 스타들의 라이브.",
    "See": "시력을 잃은 세상, 보는 아이들이 태어나다.",
    "Monarch: Legacy of Monsters": "괴수의 흔적을 쫓는 3대의 비밀.",
    "Criminal Record": "오래된 사건을 두고 맞선 두 형사.",
    // 영화
    "F1": "다시 트랙에 선 베테랑 레이서.",
    "The Gorge": "협곡을 사이에 둔 두 저격수.",
    "Ghosted": "첫 데이트 상대가 비밀 요원이었다.",
    "CODA": "가족의 목소리가 된 소녀, 자신의 노래를 찾다.",
    "Finch": "마지막 남은 남자와 로봇, 그리고 개.",
    "The Lost Bus": "산불 한가운데 갇힌 스쿨버스.",
    "Fly Me to the Moon": "달 착륙, 플랜 B가 필요하다.",
    "Wolfs": "같은 현장에 불려 온 두 해결사.",
    "The Instigators": "엉망이 된 강도 계획, 도망치는 두 남자.",
    "Greyhound": "대서양 한가운데, 호위함의 48시간.",
    "Emancipation": "자유를 향한 늪지대의 탈주.",
    "Napoleon": "황제의 야망과 사랑, 그리고 전쟁.",
  }).map(([title, line]) => [normalizeMoodTitle(title), line]),
);

// [추가] 썸네일 문구 — TMDB tagline → MOOD_TAGLINES → 줄거리 첫 문장 (항상 한 줄은 나오게)
const getMoodTagline = (item, info) => {
  const tmdb = (item.tagline || info?.tagline || "").trim();
  if (tmdb) return tmdb;
  for (const title of [item.original_name, item.original_title, item.name, item.title]) {
    const line = MOOD_TAGLINES[normalizeMoodTitle(title || "")];
    if (line) return line;
  }
  const firstSentence = (item.overview || "").trim().split(/(?<=[.!?。])\s/)[0];
  return firstSentence || "지금 Apple TV에서 만나보세요.";
};

const getMoodArtwork = (tv) => {
  for (const title of [tv.name, tv.original_name, tv.title, tv.original_title]) {
    const artwork = MOOD_ARTWORK_BY_TITLE.get(
      normalizeMoodTitle(title || ""),
    );

    if (artwork) return artwork;
  }

  // 일치하는 작품 이미지가 없으면 기존 이미지를 사용합니다.
  return null;
};

const AiCard = ({ item, history }) => {
  const type = item.media_type === "movie" ? "movie" : "tv";
  const title = item.title || item.name;
  const info = useContentInfo(type, item.id);
  const tagline = getMoodTagline(item, info); // [수정] 모든 카드에 문구 표시
  const resumable = isResumable(history);
  const path = detailPath(type, item.id);
  const artwork = getMoodArtwork(item);
  const thumb = artwork || img(item.backdrop_path, "w780") || img(item.poster_path, "w500");

  return (
    <Link to={resumable ? `${path}?play=1` : path} className="member-card member-ai-card">
      <div className="member-thumb member-ai-thumb">
        {thumb && <img src={thumb} alt={title} loading="lazy" />}
        {tagline && <span className="member-ai-tagline">{tagline}</span>}
      </div>
      <h3 className="member-card-title">{title}</h3>
      <span className="member-card-meta">{contentMeta(type, info, shortGenres(type, item.genre_ids))}</span>
      <span className="member-card-link">
        {resumable ? "이어보기" : "상세 보기"}
        <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
      </span>
    </Link>
  );
};

const MoodAssistant = ({ userName = "회원" }) => {
  const [mood, setMood] = useState(MOODS[0]);

  const [error, setError] = useState("");
  const list = useMovieStore((s) => s.moodList[mood]);
  const onFetchMood = useMovieStore((s) => s.onFetchMood);

  // 시청 기록 (이어보기 / 상세 보기 구분)
  const uid = useAuthStore((s) => s.user?.uid);
  useWatchConnect(uid);
  const history = useWatchStore((s) => s.items);
  const historyOf = (item) =>
    history.find((h) => h.type === (item.media_type === "movie" ? "movie" : "tv") && h.id === item.id);

  useEffect(() => {
    let active = true;
    setError("");
    onFetchMood(mood).catch(() => {
      if (active) setError("추천 작품을 불러오지 못했습니다. 기분 버튼을 다시 선택해주세요.");
    });
    return () => { active = false; };
  }, [mood, onFetchMood]);

  return (
    <section className="member-section member-mood">
      <div className="inner">
        <MemberSectionHead title="AI 어시스트" desc="지금의 기분에 어울리는 작품을 찾아보세요." />

        <div
          className="member-chips"
          role="group"
          aria-label="기분 선택"
        >
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`member-chip${m === mood ? " active" : ""}`}
              aria-pressed={m === mood}
              onClick={() => {
                setMood(m);
                if (m === mood && error) {
                  setError("");
                  onFetchMood(m).catch(() => setError("추천 작품을 불러오지 못했습니다. 다시 시도해주세요."));
                }
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="member-notice">
          {/* [수정] 휴대폰(767px 이하)에서는 짧은 문구 (mobile.scss 에서 둘 중 하나만 보임) */}
          <p>
            <span className="member-notice-text">{userName}님의 기분에 맞춰 추천하는 콘텐츠입니다.</span>
            <span className="member-notice-text--short">기분에 맞춰 추천해요</span>
          </p>

          {/* [수정] 홍보 배너 버튼과 같은 빛나는 버튼 (ai-glow-btn · _variables.scss 믹스인) */}
          <AiAssistantLink asButton className="member-btn ai-glow-btn">
            취향 더 반영하기
          </AiAssistantLink>
        </div>

        {error && <p role="alert">{error}</p>}
        {list?.length === 0 && <p role="status">이 기분에 맞는 작품을 아직 찾지 못했어요. 다른 기분을 선택해주세요.</p>}
        <Rail
          bleed={false}
          key={mood}
          className="rail-mood rail-ai"
          desktopGap={28}
          label="기분별 추천"
        >
          {(list ? list.slice(0, 10) : error ? [] : Array.from({ length: 4 })).map(
            (item, i) =>
              item ? (
                <SwiperSlide key={`${item.media_type || "tv"}_${item.id}`}>
                  <AiCard item={item} history={historyOf(item)} />
                </SwiperSlide>
              ) : (
                <SwiperSlide key={`sk_${i}`} aria-hidden="true">
                  <div className="member-thumb member-ai-thumb skeleton" />
                </SwiperSlide>
              ),
          )}
        </Rail>
      </div>
    </section>
  );
};

export default MoodAssistant;
