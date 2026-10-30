// src/pages/SportHome.jsx
import { useEffect } from "react";
import { useSportStore } from "../store/useSportStore";
import { useAuthStore } from "../store/useAuthStore";
import SportLive from "../components/sport/SportLive";
import SportHero from "../components/sport/SportHero";
import SportUpcoming from "../components/sport/SportUpcoming";
import SportShorts from "../components/sport/SportShorts";
import SportTeams from "../components/sport/SportTeams";
import "../sport-member.scss";
import SportConferenceStandings from "../components/sport/SportConferenceStandings";
import SportReplay from "../components/sport/SportReplay";
import SportHighlights from "../components/sport/SportHighlights";
import { Link } from "react-router-dom";
import "./sport-home-banner.css";

const SportHome = () => {
  const {
    onFetchUpcomingMatches,
    onFetchLiveMatches,
    onFetchShorts,
    onFetchStandings,
    onFetchHighlightList,
    onFetchFinishedMatches,
  } = useSportStore();

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    onFetchUpcomingMatches(); // 예정된 경기
    onFetchShorts(); // 숏츠
    onFetchStandings(); // 관심있는 구단 (리그 순위표의 팀)
    onFetchHighlightList(); // 하이라이트
    onFetchFinishedMatches(); // 영상 다시보기 (종료된 경기)
    // 경기 정보는 1분마다 갱신하고 LIVE 카드에는 위에서 받은 하이라이트를 사용합니다.
    if (user) {
      onFetchLiveMatches();
      const timer = setInterval(() => {
        onFetchLiveMatches();
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [
    user,
    onFetchUpcomingMatches,
    onFetchLiveMatches,
    onFetchShorts,
    onFetchStandings,
    onFetchHighlightList,
    onFetchFinishedMatches,
  ]);

  return (
    <main className={`page-fade sport-home${user ? " sport-home-member" : ""}`}>
      {/* 1. 히어로 (로그인 전: 메인 이미지 / 로그인 후: 라이브 + 경기 카드) */}
      <SportHero />
      {user && <SportLive />}

      {/* 2. 예정된 경기 */}
      <SportUpcoming />

      {/* 3. 숏츠 */}
      <SportShorts />

      {/* 4. 홍보 배너 */}
      {!user && (
        <section className="sport-promo-placeholder" aria-label="스포츠 홍보 배너 예정 영역">
          <div className="sport-promo-placeholder__inner">
            <span className="sport-promo-placeholder__label">SPORTS PROMOTION</span>
            <strong>스포츠 홍보 배너 영역</strong>
            <span>추후 확정된 홍보 디자인이 들어갈 자리입니다.</span>
            <Link to="/login" className="sport-promo-placeholder__link">로그인하기 →</Link>
          </div>
        </section>
      )}

      {/* 5. 관심있는 구단 */}
      <SportTeams />

      {/* 6. 리그 순위 */}
      <SportConferenceStandings />

      {/* 7. 영상 다시보기 */}
      <SportReplay title="영상 다시보기" />

      {/* 8. 하이라이트 */}
      <SportHighlights />


    </main>
  );
};

export default SportHome;
