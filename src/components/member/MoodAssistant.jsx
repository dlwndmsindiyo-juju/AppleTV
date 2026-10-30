import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import AiAssistantLink from "../ai/AiAssistantLink";
import { img, genreText, detailPath } from "./memberUtils";

// useMovieStore 의 MOOD_GENRES 키와 동일해야 함
const MOODS = ["심심한", "힘든", "슬픈", "즐거움", "화남"];

// AI-popup 이미지에 적힌 실제 작품명과 대조한 매핑입니다. 배열 순서로 이미지를 배정하지 않습니다.
const normalizeMoodTitle = (title = "") =>
  title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const MOOD_ARTWORK = [
  [1, ["슬로 호시스", "Slow Horses"]],
  [2, ["아카풀코", "Acapulco"]],
  [3, ["어둠의 나날", "See"]],
  [4, ["위도우스 베이의 저주", "위도우스 베이", "Widow’s Bay", "Widow's Bay"]],
  [5, ["인베이션", "Invasion"]],
  [6, ["저주에 걸린 가족을 구해라!", "저주에 걸린 가족을 구해라", "Curses!"]],
  [7, ["지미의 상담소", "Shrinking"]],
  [8, ["지하창고 사일로의 비밀", "사일로", "Silo"]],
  [9, ["카풀 노래방: 시리즈", "카풀 노래방", "Carpool Karaoke: The Series", "Carpool Karaoke"]],
  [10, ["케이프 피어", "Cape Fear"]],
  [11, ["크리미널 레코드", "Criminal Record"]],
  [12, ["테드 래소", "Ted Lasso"]],
  [13, ["파운데이션", "Foundation"]],
  [14, ["포 올 맨카인드", "For All Mankind"]],
  [15, ["프렌즈 & 네이버스", "프렌즈 앤 네이버스", "Your Friends & Neighbors", "Your Friends and Neighbors"]],
  [16, ["플라토닉", "Platonic"]],
  [17, ["30일의 밤", "Dark Matter"]],
  [18, ["그가 나에게 말하지 않은 것", "The Last Thing He Told Me"]],
  [19, ["더 스튜디오", "The Studio"]],
  [20, ["돈벼락", "Loot"]],
  [21, ["두 번째 스윙", "Stick"]],
  [22, ["마지막 흔적", "Last Seen"]],
  [23, ["머더봇 다이어리", "머더봇", "Murderbot"]],
  [24, ["모나크: 레거시 오브 몬스터즈", "모나크: 레거시 오브 몬스터", "Monarch: Legacy of Monsters"]],
  [25, ["모스키토 코스트", "The Mosquito Coast"]],
  [26, ["미틱 퀘스트", "Mythic Quest", "미틱 퀘스트: 레이븐스 뱅큇", "Mythic Quest: Raven’s Banquet", "Mythic Quest: Raven's Banquet"]],
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
  for (const title of [tv.name, tv.original_name]) {
    const artwork = MOOD_ARTWORK_BY_TITLE.get(normalizeMoodTitle(title || ""));
    if (artwork) return artwork;
  }
  // 폴더에 없는 작품은 기존 이미지를 유지해 다른 작품의 이미지가 표시되지 않게 합니다.
  return null;
};

const MoodAssistant = ({ userName = "회원" }) => {
  const [mood, setMood] = useState(MOODS[0]);
  const list = useMovieStore((s) => s.moodList[mood]);
  const onFetchMood = useMovieStore((s) => s.onFetchMood);

  useEffect(() => {
    onFetchMood(mood);
  }, [mood, onFetchMood]);

  return (
    <section className="member-section member-mood">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">AI 어시스턴트</h2>
            <p className="member-desc">오늘의 기분을 골라보세요</p>
          </div>
          <Link to="/recommend" className="member-more">더보기</Link>
        </div>

        <div className="member-chips" role="group" aria-label="기분 선택">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`member-chip${m === mood ? " active" : ""}`}
              aria-pressed={m === mood}
              onClick={() => setMood(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="member-notice">
          <p>{userName}님의 기분에 맞춰 추천하는 콘텐츠입니다.</p>
          <AiAssistantLink asButton className="member-btn">
            <span className="ui-icon ui-icon-plus" aria-hidden="true" />
            취향 더 반영하기
          </AiAssistantLink>
        </div>

        <Rail bleed={false} className="rail-mood" label="기분별 추천">
          {(list ? list.slice(0, 10) : Array.from({ length: 5 })).map((tv, i) => {
            const localArtwork = tv ? getMoodArtwork(tv) : null;
            return tv ? (
              <SwiperSlide key={tv.id}>
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb portrait">
                    {/* 일치하는 로컬 작품 이미지를 모든 화면 크기에서 사용합니다. */}
                    <picture>
                      {(localArtwork || tv.backdrop_path) && (
                        <source
                          media="(max-width: 1024px)"
                          srcSet={localArtwork || img(tv.backdrop_path, "w780")}
                        />
                      )}
                      <img src={localArtwork || img(tv.poster_path, "w500")} alt={tv.name} loading="lazy" />
                    </picture>
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">{genreText(tv.genre_ids)}</span>
                  <span className="member-card-meta member-clamp">{tv.overview}</span>
                  <span className="member-card-link">상세보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" /></span>
                </Link>
              </SwiperSlide>
            ) : (
              <SwiperSlide key={`sk_${i}`} aria-hidden="true">
                <div className="member-thumb portrait skeleton" />
              </SwiperSlide>
            );
          })}
        </Rail>
      </div>
    </section>
  );
};

export default MoodAssistant;
