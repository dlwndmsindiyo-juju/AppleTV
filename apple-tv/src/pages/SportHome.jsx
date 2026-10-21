// src/pages/SportHome.jsx
import { useEffect } from "react";
import { useSportStore } from "../store/useSportStore";
import { useAuthStore } from "../store/useAuthStore";
import SportLive from "../components/sport/SportLive";
import SportSeries from "../components/sport/SportSeries";
import SportHero from "../components/sport/SportHero";
import SportUpcoming from "../components/sport/SportUpcoming";
import SportShorts from "../components/sport/SportShorts";
import SportTeams from "../components/sport/SportTeams";
import SportLeague from "../components/sport/SportLeague";
import SportReplay from "../components/sport/SportReplay";
import SportHighlights from "../components/sport/SportHighlights";
import DeviceGuide from "../components/landing/DeviceGuide";
import SubscribeCTA from "../components/landing/SubscribeCTA";

const SportHome = () => {
  const {
    onFetchUpcomingMatches,
    onFetchLiveVideos,
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
    // 로그인 후 히어로와 라이브 목록은 1분마다 갱신합니다.
    if (user) {
      onFetchLiveVideos();
      onFetchLiveMatches();
      const timer = setInterval(() => {
        onFetchLiveVideos();
        onFetchLiveMatches();
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [
    user,
    onFetchUpcomingMatches,
    onFetchLiveVideos,
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
      {!user && <SubscribeCTA type="sport" />}

      {/* 5. 관심있는 구단 */}
      <SportTeams />

      {/* 6. 리그 순위 */}
      <SportLeague />

      {/* 7. 영상 다시보기 */}
      <SportReplay title="영상 다시보기" />

      {/* 8. 하이라이트 */}
      <SportHighlights />

      {/* 9. 디바이스 가이드 (마지막) */}
      {user ? <SportSeries /> : <DeviceGuide />}

    </main>
  );
};

export default SportHome;
