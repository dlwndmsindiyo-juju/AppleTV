import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { upcomingMatches, matchTitle, kickoffText } from "../../data/matchesData";

// 예정된 경기 — 시안: 경기 이미지 카드 + 왼쪽 위 날짜 · 오른쪽 위 Apple TV 로고 · 왼쪽 아래 "홈 vs. 원정"
// - 데이터: data/matchesData.js (25경기 · 경기 이미지 · 시연용 일정)
// - 홈: 가까운 경기 HOME_COUNT 개만 / "전체 보기" · 카드 → 예정된 경기 상세 (/sport/upcoming · 25경기 전부)
const HOME_COUNT = 8;
const TV_LOGO = "/icons/shorts/logo_w.svg";

const SportUpcoming = ({ title = "예정된 경기" }) => {
  const matches = upcomingMatches().slice(0, HOME_COUNT);

  return (
    <section className="sport-upcoming" id="sport-upcoming">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <Link className="sport-more" to="/sport/upcoming">
            전체 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="sport-empty">예정된 경기가 없습니다.</p>
        ) : (
          <Swiper
            modules={[Navigation]}
            navigation
            grabCursor
            slidesPerView="auto"
            spaceBetween={24}
            breakpoints={{ 0: { spaceBetween: 12 }, 768: { spaceBetween: 16 }, 1025: { spaceBetween: 24 } }}
            className="sport-up-swiper"
          >
            {matches.map((match) => {
              const name = matchTitle(match);
              const when = kickoffText(match.kickoff);
              return (
                <SwiperSlide key={match.id} className="sport-up-slide">
                  <Link className="sport-up-card" to={`/sport/upcoming?id=${match.id}`} aria-label={`${name} · ${when}`}>
                    {match.image && <img className="sport-up-bg" src={match.image} alt="" loading="lazy" />}
                    <span className="sport-up-date">{when}</span>
                    <img className="sport-up-logo" src={TV_LOGO} alt="" aria-hidden="true" />
                    <strong className="sport-up-title">{name}</strong>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>
    </section>
  );
};

export default SportUpcoming;
