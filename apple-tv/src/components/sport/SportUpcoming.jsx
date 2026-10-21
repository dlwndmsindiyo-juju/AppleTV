import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { upcomingMatchesData } from "../../data/mockMatches";
import { isLive } from "./sportUtils";

const SportUpcoming = ({ title = "예정된 경기" }) => {
  const matches = upcomingMatchesData;

  return (
    <section className="sport-upcoming" id="sport-upcoming">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <Link className="sport-more" to="/sport/upcoming">
            전체 보기 <span aria-hidden="true">→</span>
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="sport-empty">예정된 경기가 없습니다.</p>
        ) : (
          <Swiper
            modules={[Navigation]}
            navigation
            spaceBetween={20}
            slidesPerView="auto"
            className="sport-upcoming-swiper"
          >
            {matches.map((match) => {
              const live = isLive(match);

              return (
                <SwiperSlide key={match.id} className="sport-upcoming-slide">
                  <Link className="sport-match-card" to={`/sport/upcoming?id=${match.id}`}>
                    {/* 카드 전체 배경 경기장 이미지 */}
                    <img
                      className="sport-match-bg"
                      src="/images/matches/matches-bg.png"
                      alt=""
                      aria-hidden="true"
                    />
                    {/* 어두운 오버레이 섀도우 */}
                    <div className="sport-match-overlay" />

                    {/* 상단 상태 (LIVE 또는 경기 시간) */}
                    <span className="sport-match-status">
                      {live ? "LIVE" : match.status}
                    </span>

                    {/* 중앙 팀 로고 & 얇은 대각선 분할선 */}
                    <div className="sport-match-content">
                      {/* 홈 팀 로고 */}
                      <div className="sport-team">
                        {match.homeTeam?.crest ? (
                          <img
                            src={match.homeTeam.crest}
                            alt={match.homeTeam.name}
                          />
                        ) : (
                          <span className="sport-crest-empty" />
                        )}
                      </div>

                      {/* 얇은 대각선 선 */}
                      <div className="sport-match-divider" />

                      {/* 원정 팀 로고 */}
                      <div className="sport-team">
                        {match.awayTeam?.crest ? (
                          <img
                            src={match.awayTeam.crest}
                            alt={match.awayTeam.name}
                          />
                        ) : (
                          <span className="sport-crest-empty" />
                        )}
                      </div>
                    </div>
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