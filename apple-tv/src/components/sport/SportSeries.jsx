import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useMovieStore } from "../../store/useMovieStore";

export default function SportSeries() {
  const series = useMovieStore((state) => state.recommended);
  const fetchSeries = useMovieStore((state) => state.onFetchRecommended);
  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  return (
    <section className="sport-series" aria-labelledby="sport-series-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-series-title">추천 시리즈</h3>
        </div>
        {series.length === 0 ? <p className="sport-empty">추천 시리즈가 없습니다.</p> : (
          <Swiper modules={[Navigation]} navigation slidesPerView="auto" spaceBetween={20}>
            {series.map((item) => (
              <SwiperSlide key={item.id} className="sport-series-slide">
                <Link to={`/detail/${item.id}?type=tv`} className="sport-series-card">
                  {item.backdrop_path || item.poster_path ? <img src={`https://image.tmdb.org/t/p/w780${item.poster_path || item.backdrop_path}`} alt="" loading="lazy" /> : <div className="sport-series-placeholder" />}
                  <span className="sport-series-play" aria-hidden="true">▶</span>
                  <h4>{item.name}</h4>
                  <p className="sport-series-description">{item.overview}</p>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
