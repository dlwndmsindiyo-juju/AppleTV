import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";

// Apple 오리지널 (TMDB 에서 애플 TV+ 방송사로 분류된 시리즈)
const AppleOriginals = ({
  title = "Apple 오리지널",
  desc = "Apple TV에서만 만날 수 있는 오리지널 시리즈",
}) => {
  const { appleOriginals, onFetchAppleOriginals } = useMovieStore();

  useEffect(() => {
    onFetchAppleOriginals();
  }, [onFetchAppleOriginals]);

  // 포스터가 있는 작품만 4개 (데이터가 없으면 섹션 숨김)
  const items = (appleOriginals || [])
    .filter((tv) => tv.poster_path)
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="apple-originals">
      <div className="inner">
        <h3 className="apple-originals-title">{title}</h3>
        <p className="apple-originals-desc">{desc}</p>

        <ul className="apple-originals-list">
          {items.map((tv) => (
            <li key={tv.id}>
              <Link to={`/detail/${tv.id}`} className="apple-card">
                <div className="apple-card-poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
                    alt={tv.name}
                  />
                </div>
                <h4 className="apple-card-title">{tv.name}</h4>
                <span className="apple-card-meta">
                  {tv.first_air_date ? tv.first_air_date.slice(0, 4) : "-"}
                </span>
                <span className="apple-card-meta">
                  ★ {tv.vote_average ? tv.vote_average.toFixed(1) : "-"}
                </span>
                <span className="apple-card-badge">Apple Original</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AppleOriginals;
