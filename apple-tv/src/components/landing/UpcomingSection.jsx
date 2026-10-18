import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";

// 날짜 문자열(2026-11-05) → "2026. 11. 5 개봉"
const formatRelease = (dateStr) => {
  if (!dateStr) return "개봉 예정";
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 개봉`;
};

// 새로운 개봉 예정작 (2개 카드)
const UpcomingSection = ({
  title = "새로운 이야기가 찾아오는 날",
  desc = "곧 공개될 개봉 예정작을 먼저 만나보세요",
}) => {
  const { upcoming, onFetchUpcoming } = useMovieStore();

  useEffect(() => {
    onFetchUpcoming();
  }, [onFetchUpcoming]);

  if (!upcoming || upcoming.length === 0) return null;

  // 오늘 이후 개봉작을 가까운 날짜순으로 정렬 후 2개
  const today = new Date().toISOString().slice(0, 10);
  const items = upcoming
    .filter((m) => m.release_date && m.release_date >= today)
    .sort((a, b) => a.release_date.localeCompare(b.release_date))
    .slice(0, 2);

  if (items.length === 0) return null;

  return (
    <section className="upcoming-section">
      <div className="inner">
      <h3 className="upcoming-title">{title}</h3>
      <p className="upcoming-desc">{desc}</p>

      <div className="upcoming-list">
        {items.map((movie) => (
          <article className="upcoming-card" key={movie.id}>
            <div className="upcoming-thumb">
              {(movie.backdrop_path || movie.poster_path) && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${
                    movie.backdrop_path || movie.poster_path
                  }`}
                  alt={movie.title}
                />
              )}
            </div>

            <div className="upcoming-info">
              <span className="upcoming-date">
                {formatRelease(movie.release_date)}
              </span>
              <h4 className="upcoming-movie-title">{movie.title}</h4>
              <p className="upcoming-overview">
                {movie.overview || "줄거리 정보가 아직 없습니다."}
              </p>
              <Link to={`/detail/${movie.id}`} className="upcoming-btn">
                상세 정보
              </Link>
            </div>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
};

export default UpcomingSection;
