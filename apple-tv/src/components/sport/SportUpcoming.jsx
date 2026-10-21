import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { upcomingMatchesData } from "../../data/mockMatches";
import { isLive } from "./sportUtils";

// 구단별 색은 회원 홈의 카드 배경에만 사용합니다. 기존 일정과 게스트 화면은 유지합니다.
const teamColors = {
  atlanta: "#800d24", miami: "#edb5ca", redbull: "#d12235", toronto: "#a6192e",
  minnesota: "#8bc5e8", "st-louis": "#c8102e", sanjose: "#0065a8", nashville: "#ece83a",
  seattle: "#4d9f38", montreal: "#00539b", cincinnati: "#fa641c", columbus: "#f5d329",
  orlando: "#6331a8", newYork: "#74b8e5", LA: "#101820", dallas: "#c8102e",
};
const teamColor = (team) => teamColors[team?.crest?.split("/").pop()?.replace(".svg", "")] || "#233b57";

const SportUpcoming = ({ title = "예정된 경기" }) => {
  const matches = upcomingMatchesData;

  return (
    <section className="sport-upcoming" id="sport-upcoming">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
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
                  <div className="sport-match-card" style={{ "--sport-home-color": teamColor(match.homeTeam), "--sport-away-color": teamColor(match.awayTeam) }}>
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
                  </div>
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