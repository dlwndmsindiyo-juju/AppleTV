import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, genreText, detailPath } from "./memberUtils";

// 실제 시청 기록 API 연결 전까지 쓰는 임시 진행 값
const SAMPLE_PROGRESS = [
  { progress: 0.62, episode: 4, left: 18 },
  { progress: 0.35, episode: 2, left: 42 },
  { progress: 0.8, episode: 4, left: 16 },
  { progress: 0.5, episode: 3, left: 24 },
];

const ContinueWatching = () => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const items = appleOriginals.slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="member-section member-continue">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">이어보기</h2>
            <p className="member-desc">멈춘 곳에서 이어서 감상하기</p>
          </div>
        </div>

        <ul className="member-rail rail-continue">
          {items.map((tv, i) => {
            const p = SAMPLE_PROGRESS[i % SAMPLE_PROGRESS.length];
            return (
              <li key={tv.id}>
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb landscape">
                    <img
                      src={img(tv.backdrop_path || tv.poster_path, "w780")}
                      alt={tv.name}
                      loading="lazy"
                    />
                    <div className="member-progress">
                      <span style={{ width: `${p.progress * 100}%` }} />
                    </div>
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">
                    {genreText(tv.genre_ids, undefined, 1)} · 시리즈 · Apple Original
                  </span>
                  <span className="member-card-meta">
                    시즌 1 · {p.episode}화 · {p.left}분 남음
                  </span>
                  <span className="member-card-link">이어보기 ›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default ContinueWatching;
