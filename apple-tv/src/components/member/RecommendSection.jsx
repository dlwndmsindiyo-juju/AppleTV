import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, genreText, detailPath } from "./memberUtils";

const RecommendSection = () => {
  const recommended = useMovieStore((s) => s.recommended);
  const wishlist = useMovieStore((s) => s.wishlist);
  const onToggleWishlist = useMovieStore((s) => s.onToggleWishlist);

  if (recommended.length === 0) return null;

  return (
    <section className="member-section member-recommend">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">추천작</h2>
            <p className="member-desc">지금 많이 보는 작품 중에서 골랐어요</p>
          </div>
          <Link to="/recommend" className="member-more">추천 더 보기 ›</Link>
        </div>

        <ul className="member-rail rail-poster">
          {recommended.slice(0, 10).map((tv) => {
            const saved = wishlist.some((w) => w.id === tv.id && w.type === "tv");
            return (
              <li key={tv.id} className="member-poster-item">
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb portrait">
                    <img src={img(tv.poster_path, "w500")} alt={tv.name} loading="lazy" />
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">
                    {genreText(tv.genre_ids)}
                  </span>
                  <span className="member-card-meta">
                    {(tv.first_air_date || "").slice(0, 4)} · ★ {tv.vote_average?.toFixed(1)}
                  </span>
                  <span className="member-card-meta member-clamp">{tv.overview}</span>
                </Link>
                <button
                  type="button"
                  className={`member-heart${saved ? " on" : ""}`}
                  aria-pressed={saved}
                  aria-label={saved ? `${tv.name} 찜 해제` : `${tv.name} 찜하기`}
                  onClick={() =>
                    onToggleWishlist({
                      id: tv.id,
                      name: tv.name,
                      poster_path: tv.poster_path,
                      type: "tv",
                    })
                  }
                >
                  {saved ? "♥" : "♡"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default RecommendSection;
