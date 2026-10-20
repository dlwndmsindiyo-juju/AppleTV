import React from "react";
import { Swiper } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

// 가로 슬라이드 공통 (Swiper) — 좌우 네비게이터 필수, 이너 폭 안에서 잘림(overflow hidden)
// - children 은 <SwiperSlide> 목록 (swiper/react 에서 import)
// - className(예: rail-continue) 은 슬라이드 너비/버튼 위치용 CSS 변수를 지정
// - stack: 모바일(767px 이하)에서 슬라이드를 끄고 세로로 쌓는 섹션용 (시안)
// - bleed: false 면 슬라이드 끝 여백(slidesOffsetAfter)을 0 으로 (좌우 여백이 대칭인 섹션용)
const Rail = ({ className = "", label = "슬라이드", stack = false, bleed = true, children }) => (
  <Swiper
    className={`member-slider ${className}`}
    modules={[Navigation, A11y]}
    navigation
    a11y={{
      prevSlideMessage: `${label} 이전`,
      nextSlideMessage: `${label} 다음`,
    }}
    slidesPerView="auto"
    grabCursor
    // 슬라이드 폭은 CSS(--rail-col) 로 지정, 간격 / 끝 여백만 화면 크기별로 지정
    breakpoints={{
      0: { spaceBetween: stack ? 0 : 16, slidesOffsetAfter: stack || !bleed ? 0 : 20, enabled: !stack },
      768: { spaceBetween: 24, slidesOffsetAfter: bleed ? 100 : 0, enabled: true },
      1025: { spaceBetween: 24, slidesOffsetAfter: 0, enabled: true },
    }}
  >
    {children}
  </Swiper>
);

export default Rail;
