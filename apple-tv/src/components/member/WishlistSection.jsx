import React from "react";
import { Link } from "react-router-dom";
import { SwiperSlide } from "swiper/react";
import { useMovieStore } from "../../store/useMovieStore";
import Rail from "../common/Rail";
import { img, detailPath } from "./memberUtils";

const WishlistSection = () => {
  const wishlist = useMovieStore((s) => s.wishlist);
  const appleOriginals = useMovieStore((s) => s.appleOriginals);

  // 저장한 작품이 없으면 Apple 오리지널을 샘플로 보여줌
  const items = (
    wishlist.length > 0
      ? wishlist
      : appleOriginals.map((tv) => ({
          id: tv.id,
          name: tv.name,
          poster_path: tv.poster_path,
          type: "tv",
        }))
  ).slice(0, 10);

  if (items.length === 0) return null;

  return (
    <section className="member-section band member-wishlist">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">내가 찜한 콘텐츠</h2>
            <p className="member-desc">저장해 둔 작품을 한곳에서 확인하세요</p>
          </div>
          <Link to="/wishlist" className="member-more">더보기</Link>
        </div>

        <Rail bleed={false} className="rail-wish" label="찜한 콘텐츠">
          {items.map((item) => (
            <SwiperSlide key={`${item.type}_${item.id}`}>
              <Link to={detailPath(item.type, item.id)} className="member-wish-card">
                <span className="member-wish-thumb">
                  <img src={img(item.poster_path, "w154")} alt="" loading="lazy" />
                </span>
                <span className="member-wish-info">
                  <strong className="member-wish-name">{item.name}</strong>
                  <span className="member-card-meta">저장한 작품</span>
                  <span className="member-card-link">작품 보기 ›</span>
                </span>
              </Link>
            </SwiperSlide>
          ))}
        </Rail>
      </div>
    </section>
  );
};

export default WishlistSection;
