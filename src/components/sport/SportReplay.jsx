import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { REPLAY_LEAGUES } from "../../data/replayLeagues";

// 경기 다시보기 — 국가별 1부 리그 영상 모음집 (data/replayLeagues.js)
// - 리그 공식 YouTube 채널 재생목록을 직접 지정 → API 키 없이 항상 같은 모음집
// - 카드를 누르면 /sport/replay?id=리그 에서 재생목록 재생 (로그인 전에는 구독 팝업)
// - 썸네일: cover 이미지가 있으면 사용, 없으면 리그 이름 + 국가 글자 카드

// 리그 썸네일 (이미지가 없을 때 글자 카드) — 다시보기 상세 목록에서도 사용
export const LeagueCover = ({ league, small = false }) => (
  <span className={`sport-league-cover${small ? " is-small" : ""}`} aria-hidden="true">
    <strong>{league.leagueEn}</strong>
    {!small && <span>{league.country}</span>}
  </span>
);

const SportReplay = ({ title = "경기 다시보기" }) => {
  // 최근 종료 경기: 다시보기 카드에는 쓰지 않지만, 하이라이트 섹션의 첫 카드("A vs B 하이라이트")가 사용
  const fetchFinished = useSportStore((state) => state.onFetchFinishedMatches);
  useEffect(() => {
    fetchFinished();
  }, [fetchFinished]);

  return (
    <section className="sport-replay">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <Link className="sport-more" to="/sport/replay">
            전체 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </Link>
        </div>

        {REPLAY_LEAGUES.length === 0 ? (
          <p className="sport-empty">다시볼 영상이 없습니다.</p>
        ) : (
          <ul className="sport-replay-list">
            {REPLAY_LEAGUES.map((league) => (
              <li key={league.id}>
                <Link
                  className="sport-replay-card"
                  to={`/sport/replay?id=${league.id}`}
                  aria-label={`${league.country} ${league.league} 영상 모음 보기`}
                >
                  <div className="sport-replay-thumb sport-replay-thumb--league">
                    {league.cover ? <img src={league.cover} alt="" loading="lazy" /> : <LeagueCover league={league} />}
                  </div>
                  <span className="sport-replay-name">{league.league}</span>
                  <span className="sport-replay-date">
                    <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
                    {league.country} · 영상 모음 보기
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SportReplay;
