import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules"; // [수정] A11y: 키보드(Tab)로 화면 밖 카드를 고르면 그 카드가 보이게 밀어 줌
import "swiper/css";
import "swiper/css/navigation";
import { SPORT_SERIES_DATA } from "../../data/mockSportSeries";
import SportSectionHead from "./SportSectionHead"; // [정리] 섹션 머리 공용
import { SportBack } from "./SportBack";

// 추천 시리즈 (시안: 세로 포스터가 카드를 가득 채우고, 위에 이름 · 분류 · 설명이 겹치는 슬라이드)
// - 데이터: data/mockSportSeries.js (포스터는 public/images/sport/series-*.webp)
// - 카드를 누르면 스포츠 상세(/sport/series?id=...)에서 영상 재생 · "전체 보기"는 상세 첫 시리즈부터
//   (영상 주소 youtubeUrl 이 없는 시리즈는 상세 목록에서 빠지고 카드만 표시)
const SERIES_TYPE = "TV프로그램 · 스포츠"; // 시안: "TV프로그램 · 스포츠 · 뉴스" 처럼 분류 앞에 붙음

export default function SportSeries({ title = "추천 시리즈" }) {
  const series = SPORT_SERIES_DATA;

  const card = (item) => (
    <article className="sport-sc-card">
      {item.poster ? (
        <img className="sport-sc-poster" src={item.poster} alt="" loading="lazy" />
      ) : (
        <span className="sport-sc-poster sport-sc-poster--empty" aria-hidden="true" />
      )}
      <div className="sport-sc-body">
      <p className="sport-sc-category">
        {[SERIES_TYPE, item.category].filter(Boolean).join(" · ")}
      </p>
      <h4 className="sport-sc-title">{item.title}</h4>
      {item.description && (
        <p className="sport-sc-desc">{item.description}</p>
      )}
    </div>
    </article>
  );

  return (
    <section className="sport-series" aria-labelledby="sport-series-title">
      <div className="inner">
        <SportSectionHead title={title} titleId="sport-series-title" to="/sport/series" />

        {series.length === 0 ? (
          <p className="sport-empty">추천 시리즈가 없습니다.</p>
        ) : (
          <Swiper
            className="sport-sc-swiper"
            modules={[Navigation, A11y]}
            navigation
            grabCursor
            slidesPerView="auto"
            spaceBetween={24}
            breakpoints={{ 0: { spaceBetween: 12 }, 768: { spaceBetween: 24 } }}
          >
            {series.map((item) => (
              <SwiperSlide key={item.id} className="sport-sc-slide">
                {item.youtubeUrl ? (
                  <Link to={`/sport/series?id=${item.id}`} className="sport-sc-link" aria-label={`${item.title} 재생`}>
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
