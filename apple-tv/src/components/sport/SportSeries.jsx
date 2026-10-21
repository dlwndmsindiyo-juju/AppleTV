import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { SPORT_SERIES_DATA } from "../../data/mockSportSeries";

// 추천 시리즈 (스포츠 오리지널 시리즈 카드 슬라이드)
// - 데이터: data/mockSportSeries.js (포스터는 public/images/sport/series-*.webp)
export default function SportSeries({ title = "추천 시리즈" }) {
  const series = SPORT_SERIES_DATA;

  return (
    <section className="sport-series" aria-labelledby="sport-series-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-series-title">{title}</h3>
        </div>

        {series.length === 0 ? (
          <p className="sport-empty">추천 시리즈가 없습니다.</p>
        ) : (
          <Swiper modules={[Navigation]} navigation slidesPerView="auto" spaceBetween={24}>
            {series.map((item) => (
              <SwiperSlide key={item.id} className="sport-series-slide">
                <article className="sport-series-card">
                  <div className="sport-series-thumb">
                    {item.poster ? (
                      <img src={item.poster} alt="" loading="lazy" />
                    ) : (
                      <div className="sport-series-placeholder" />
                    )}
                    <span className="sport-series-play" aria-hidden="true">▶</span>
                  </div>
                  <span className="sport-series-category">{item.category}</span>
                  <h4>{item.title}</h4>
                  <p className="sport-series-description">{item.description}</p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
