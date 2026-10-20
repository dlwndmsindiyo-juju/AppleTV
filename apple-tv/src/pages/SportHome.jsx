// src/pages/SportHome.jsx
import React, { useEffect } from "react";
import { useSportStore } from "../store/useSportStore";
import { useAuthStore } from "../store/useAuthStore";
import SportHero from "../components/sport/SportHero";
import SportUpcoming from "../components/sport/SportUpcoming";
import SportShorts from "../components/sport/SportShorts";
import SportTeams from "../components/sport/SportTeams";
import SportLeague from "../components/sport/SportLeague";
import SportReplay from "../components/sport/SportReplay";
import SportHighlights from "../components/sport/SportHighlights";
import DeviceGuide from "../components/landing/DeviceGuide";
import PromoBanner from "../components/landing/PromoBanner";
import SubscribeCTA from "../components/landing/SubscribeCTA";

const SportHome = () => {
  const {
    onFetchUpcomingMatches,
    onFetchLiveVideos,
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
    // 라이브 영상은 로그인 후 히어로에서만 사용 (로그인 전엔 요청 안 함)
    if (user) onFetchLiveVideos();
  }, [
    user,
    onFetchUpcomingMatches,
    onFetchLiveVideos,
    onFetchShorts,
    onFetchStandings,
    onFetchHighlightList,
    onFetchFinishedMatches,
  ]);

  return (
    <main className="page-fade">
      {/* 1. 히어로 (로그인 전: 메인 이미지 / 로그인 후: 라이브 + 경기 카드) */}
      <SportHero />

      {/* 2. 예정된 경기 */}
      <SportUpcoming />

      {/* 3. 숏츠 */}
      <SportShorts />

      {/* 4. 홍보 배너 */}
      <SubscribeCTA type="sport" />

      {/* 5. 관심있는 구단 */}
      <SportTeams />

      {/* 6. 리그 순위 */}
      <SportLeague />

      {/* 7. 영상 다시보기 */}
      <SportReplay />

      {/* 8. 하이라이트 */}
      <SportHighlights />

      {/* 9. 디바이스 가이드 (마지막) */}
      <DeviceGuide />

      {/* 10. 구독 전 프로모션 배너 (첫 스크롤 후 하단에 떠 있음, 로그인하면 사라짐) */}
      <PromoBanner />
    </main>
  );
};

export default SportHome;
