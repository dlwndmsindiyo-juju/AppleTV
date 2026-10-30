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

// AI 어시스트 — 시안: 기분 칩 → 안내 바(취향 더 반영하기) → 가로형 카드 4장 슬라이드
// - 작품: 기분별 Apple TV+ 시리즈 + 영화를 번갈아 섞음 (store/moodRecommendations.mjs)
// - 썸네일 안 문구: 작품 소개 한 줄(tagline)만 · 없으면 표시하지 않음
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
  const tagline = (item.tagline || info?.tagline || "").trim();
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
        <div className="member-head">
          <div>
            <h2 className="member-title">AI 어시스트</h2>
            <p className="member-desc">지금의 기분에 어울리는 작품을 찾아보세요.</p>
          </div>
        </div>

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
          <p>{userName}님의 기분에 맞춰 추천하는 콘텐츠입니다.</p>

          <AiAssistantLink asButton className="member-btn">
            취향 더 반영하기
          </AiAssistantLink>
        </div>

        {error && <p role="alert">{error}</p>}
        {list?.length === 0 && <p role="status">이 기분에 맞는 작품을 아직 찾지 못했어요. 다른 기분을 선택해주세요.</p>}
        <Rail
          bleed={false}
          key={mood}
          className="rail-mood rail-ai"
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
