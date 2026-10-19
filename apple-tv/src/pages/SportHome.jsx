// src/pages/SportHome.jsx
import React, { useEffect } from "react";
import { useSportStore } from "../store/useSportStore";
import SportHero from "../components/sport/SportHero";
import SportUpcoming from "../components/sport/SportUpcoming";
import SportShorts from "../components/sport/SportShorts";

const SportHome = () => {
  const { onFetchUpcomingMatches, onFetchLiveVideos, onFetchShorts } =
    useSportStore();

  useEffect(() => {
    onFetchUpcomingMatches(); // 예정된 경기 (히어로 카드 + 예정된 경기 섹션)
    onFetchLiveVideos(); // 라이브 영상 (히어로 배경 + 경기 시청 링크)
    onFetchShorts(); // 숏츠
  }, [onFetchUpcomingMatches, onFetchLiveVideos, onFetchShorts]);

  return (
    <main className="page-fade">
      {/* 1. 히어로 (라이브 + 경기 카드) */}
      <SportHero />

      {/* 2. 예정된 경기 */}
      <SportUpcoming />

      {/* 3. 숏츠 */}
      <SportShorts />
    </main>
  );
};

export default SportHome;
