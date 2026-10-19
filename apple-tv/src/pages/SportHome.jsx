// src/pages/SportHome.jsx
import React, { useEffect } from "react";
import { useSportStore } from "../store/useSportStore";
import { useAuthStore } from "../store/useAuthStore";
import SportHero from "../components/sport/SportHero";
import SportUpcoming from "../components/sport/SportUpcoming";
import SportShorts from "../components/sport/SportShorts";
import SportPromo from "../components/sport/SportPromo";

const SportHome = () => {
  const { onFetchUpcomingMatches, onFetchLiveVideos, onFetchShorts } =
    useSportStore();

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    onFetchUpcomingMatches(); // 예정된 경기
    onFetchShorts(); // 숏츠
    // 라이브 영상은 로그인 후 히어로에서만 사용 (로그인 전엔 요청 안 함)
    if (user) onFetchLiveVideos();
  }, [user, onFetchUpcomingMatches, onFetchLiveVideos, onFetchShorts]);

  return (
    <main className="page-fade">
      {/* 1. 히어로 (로그인 전: 메인 이미지 / 로그인 후: 라이브 + 경기 카드) */}
      <SportHero />

      {/* 2. 예정된 경기 */}
      <SportUpcoming />

      {/* 3. 숏츠 */}
      <SportShorts />

      {/* 4. 홍보 배너 */}
      <SportPromo />
    </main>
  );
};

export default SportHome;
