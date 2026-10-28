import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { toggleWish, useHeartStore, wishKey } from "../../store/useHeartStore"; // 위시리스트 (Firestore)
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import { img, genreText, detailPath } from "./memberUtils";

const RecommendSection = () => {
  const recommended = useMovieStore((s) => s.recommended);
  const wishItems = useHeartStore((s) => s.items);

  if (recommended.length === 0) return null;

  return (
    <section className="member-section member-recommend">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">추천작</h2>
            <p className="member-desc">지금 많이 보는 작품 중에서 골랐어요</p>
          </div>
          <Link to="/recommend" className="member-more">
            추천 더 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </Link>
        </div>

        <Rail className="rail-poster" label="추천작">
          {recommended.slice(0, 10).map((tv) => {
            const saved = Boolean(wishItems[wishKey("tv", tv.id)]);
            return (
              <SwiperSlide key={tv.id} className="member-poster-item">
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb portrait">
                    <img src={img(tv.poster_path, "w500")} alt={tv.name} loading="lazy" />
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">{genreText(tv.genre_ids) || "시리즈"}</span>
                  <span className="member-card-meta">
                    {(tv.first_air_date || "").slice(0, 4) || "방영 예정"} · 시리즈
                  </span>
                  <span className="member-card-strong member-rating">
                    <img className="star-icon" src="/icons/star-icon.svg" alt="" aria-hidden="true" />
                    {tv.vote_average ? tv.vote_average.toFixed(1) : "-"}
                  </span>
                  <span className="member-card-meta member-clamp one">{tv.overview}</span>
                  <span className="member-card-link">작품 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" /></span>
                </Link>
                <button
                  type="button"
                  className={`member-heart${saved ? " on" : ""}`}
                  aria-pressed={saved}
                  aria-label={saved ? `${tv.name} 찜 해제` : `${tv.name} 찜하기`}
                  onClick={() =>
                    toggleWish({
                      id: tv.id,
                      type: "tv",
                      title: tv.name,
                      poster_path: tv.poster_path,
                      backdrop_path: tv.backdrop_path,
                      overview: tv.overview,
                    })
                  }
                >
                  {/* public/icons/heart-icon.svg (찜하면 빨간색) */}
                  <span className="member-heart-icon" aria-hidden="true" />
                </button>
              </SwiperSlide>
            );
          })}
        </Rail>
      </div>
    </section>
  );
};

export default RecommendSection;
