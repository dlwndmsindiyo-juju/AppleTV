import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { SPORT_SERIES_DATA } from "../../data/mockSportSeries";

// 추천 시리즈 (스포츠 오리지널 시리즈 카드 슬라이드)
// - 데이터: data/mockSportSeries.js (포스터는 public/images/sport/series-*.webp)
// - 카드를 누르면 하이라이트처럼 스포츠 상세(/sport/series?id=...)에서 영상 재생
//   (영상 주소는 youtubeUrl, 없는 시리즈는 상세 목록에서 빠지고 카드만 표시)
export default function SportSeries({ title = "추천 시리즈" }) {
  const series = SPORT_SERIES_DATA;

  const card = (item) => (
    <article className="sport-series-card">
      <div className="sport-series-thumb">
        {item.poster ? (
          <img src={item.poster} alt="" loading="lazy" />
        ) : (
          <div className="sport-series-placeholder" />
        )}
        <span className="sport-series-play" aria-hidden="true">
          <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
        </span>
      </div>
      <span className="sport-series-category">{item.category}</span>
      <h4>{item.title}</h4>
      <p className="sport-series-description">{item.description}</p>
    </article>
  );

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
                {item.youtubeUrl ? (
                  <Link
                    to={`/sport/series?id=${item.id}`}
                    className="sport-series-link"
                    aria-label={`${item.title} 재생`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    {card(item)}
                  </Link>
                ) : (
                  card(item)
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
