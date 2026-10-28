import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, genreText, detailPath, MOVIE_GENRES } from "./memberUtils";

const ComingSoon = () => {
  const upcoming = useMovieStore((s) => s.upcoming);
  const alarms = useMovieStore((s) => s.alarms);
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);

  const items = upcoming.filter((m) => m.poster_path).slice(0, 2);
  if (items.length === 0) return null;

  return (
    <section className="member-section member-coming">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">공개예정작</h2>
            <p className="member-desc">시선을 사로잡을 다음 이야기</p>
          </div>
        </div>

        <ul className="member-pair">
          {items.map((m) => {
            const on = alarms.includes(`movie_${m.id}`);
            return (
              <li key={m.id} className="member-wide-card tall">
                <Link to={detailPath("movie", m.id)} className="member-wide-thumb poster">
                  <img src={img(m.poster_path, "w342")} alt="" loading="lazy" />
                </Link>
                <div className="member-wide-info">
                  <span className="member-card-meta">
                    {genreText(m.genre_ids, MOVIE_GENRES)}
                    {m.release_date ? ` · ${m.release_date}` : ""}
                  </span>
                  <h3 className="member-card-title">{m.title}</h3>
                  <span className="member-card-meta member-clamp">{m.overview}</span>
                  <button
                    type="button"
                    className={`member-btn${on ? " filled" : ""}`}
                    aria-pressed={on}
                    onClick={() => onToggleAlarm(`movie_${m.id}`)}
                  >
                    {on ? (
                      <>
                        <span className="ui-icon ui-icon-check" aria-hidden="true" />
                        알림 설정됨
                      </>
                    ) : (
                      "알람 받기"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default ComingSoon;
