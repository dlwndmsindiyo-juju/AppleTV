import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules"; // [수정] A11y: 키보드(Tab)로 화면 밖 카드를 고르면 그 카드가 보이게 밀어 줌
import "swiper/css";
import "swiper/css/navigation";
import { useSportStore } from "../../store/useSportStore";
import { REPLAY_LEAGUES, leagueThumb } from "../../data/replayLeagues";
import SportSectionHead from "./SportSectionHead"; // [정리] 섹션 머리 공용

// 경기 다시보기 — 국가별 1부 리그 영상 모음집 (data/replayLeagues.js)
// - 리그 공식 YouTube 채널 재생목록을 직접 지정 → API 키 없이 항상 같은 모음집
// - 가로 슬라이드: 추천 시리즈와 같은 Swiper (좌우 화살표 · 마우스 드래그 · 터치)
// - 카드를 누르면 /sport/replay?id=리그 에서 재생목록 재생 (로그인 전에는 구독 팝업)
// - 썸네일: 지정한 YouTube 영상 썸네일(thumbVideoId) · cover 이미지, 없으면 리그 이름 + 국가 글자 카드

// 리그 썸네일 (이미지가 없을 때 글자 카드) — 다시보기 상세 목록에서도 사용
export const LeagueCover = ({ league, small = false }) => (
  <span className={`sport-league-cover${small ? " is-small" : ""}`} aria-hidden="true">
    <strong>{league.leagueEn}</strong>
    {!small && <span>{league.country}</span>}
  </span>
);

// 섹션 제목은 "경기 다시보기" 로 고정 (부모에서 title="영상 다시보기" 를 넘겨도 무시)
const TITLE = "경기 다시보기";

const SportReplay = () => {
  // 최근 종료 경기: 다시보기 카드에는 쓰지 않지만, 하이라이트 섹션의 첫 카드("A vs B 하이라이트")가 사용
  const fetchFinished = useSportStore((state) => state.onFetchFinishedMatches);
  useEffect(() => {
    fetchFinished();
  }, [fetchFinished]);

  return (
    <section className="sport-replay">
      <div className="inner">
        <SportSectionHead title={TITLE} to="/sport/replay" />

        {REPLAY_LEAGUES.length === 0 ? (
          <p className="sport-empty">다시볼 영상이 없습니다.</p>
        ) : (
          <Swiper
            className="sport-replay-swiper"
            modules={[Navigation, A11y]}
            navigation
            grabCursor
            slidesPerView="auto"
            spaceBetween={24}
            breakpoints={{ 0: { spaceBetween: 12 }, 768: { spaceBetween: 24 } }}
          >
            {REPLAY_LEAGUES.map((league) => (
              <SwiperSlide key={league.id} className="sport-replay-slide">
                <Link
                  className="sport-replay-card"
                  to={`/sport/replay?id=${league.id}`}
                  aria-label={`${league.country} ${league.league} 영상 모음 보기`}
                >
                  <div className="sport-replay-thumb sport-replay-thumb--league">
                    {leagueThumb(league) ? (
                      <img src={leagueThumb(league)} alt="" loading="lazy" />
                    ) : (
                      <LeagueCover league={league} />
                    )}
                  </div>
                  <span className="sport-replay-name">{league.league}</span>
                  <span className="sport-replay-date">
                    <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
                    {league.league} · 영상 모음 보기
                  </span>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
};

export default SportReplay;
