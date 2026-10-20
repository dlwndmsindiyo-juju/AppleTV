import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, genreText, detailPath } from "./memberUtils";

// useMovieStore 의 MOOD_GENRES 키와 동일해야 함
const MOODS = ["심심한", "힘든", "슬픈", "즐거움", "화남"];

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
          <button type="button" className="member-btn">취향 더 반영하기</button>
        </div>

        <ul className="member-rail rail-mood">
          {(list ? list.slice(0, 10) : Array.from({ length: 5 })).map((tv, i) =>
            tv ? (
              <li key={tv.id}>
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb portrait">
                    <img src={img(tv.poster_path, "w500")} alt={tv.name} loading="lazy" />
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">{genreText(tv.genre_ids)}</span>
                  <span className="member-card-meta member-clamp">{tv.overview}</span>
                  <span className="member-card-link">상세보기 ›</span>
                </Link>
              </li>
            ) : (
              <li key={`sk_${i}`} aria-hidden="true">
                <div className="member-thumb portrait skeleton" />
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
};

export default MoodAssistant;
