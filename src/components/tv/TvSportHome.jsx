import React, { useEffect, useMemo, useState } from "react";
import TvPlayer from "./TvPlayer";
import { TV_SPORT_BG } from "../../data/tvSportData";
import { TvBrowseScreen } from "./TvRows";
import { useSportStore } from "../../store/useSportStore";
import { REPLAY_LEAGUES, leagueThumb } from "../../data/replayLeagues";
import { upcomingMatches, matchTitle } from "../../data/matchesData";
import { SPORT_SERIES_DATA } from "../../data/mockSportSeries";
import { SPORT_TEAMS } from "../../data/sportTeams";
import { decodeHtml, ytThumb } from "../sport/sportUtils"; // [정리] 썸네일 공용

// TV 스포츠 화면 (1920 × 1080 기준) — 시안: 03 · 스포츠 · 하이라이트 · 스타일: TV.scss (.tv-sport)
// - 위: TV 헤더 (로고 + 홈 · 스포츠 · 보관함 · 검색, "스포츠" 선택)
// - 아래: PC 스포츠 홈과 같은 섹션 · 같은 데이터
//   경기 다시보기 → 하이라이트 → 예정된 경기 → 추천 시리즈 → 관심있는 구단
// - [수정] TV 에서는 숏츠 섹션 · 실시간 채팅 없음
// - 모든 섹션 같은 카드: 리모컨 포커스가 있는 줄 560 × 315 / 나머지 줄 410 × 230 · 아래 제목
//   · 카드에 포커스가 오면 그 줄이 active 가 되고, 화면 안에 보이도록 위아래 · 옆으로 이동
// - 방향키 이동은 미리보기(TvPreview.jsx)의 리모컨 처리 그대로 사용

// PC 스포츠 홈 섹션 데이터 → TV 카드 { id, title, image }
const useTvSportRows = () => {
  const finishedMatches = useSportStore((s) => s.finishedMatches);
  const highlightList = useSportStore((s) => s.highlightList);
  const categories = useSportStore((s) => s.highlightCategories);
  const fetchFinished = useSportStore((s) => s.onFetchFinishedMatches);
  const fetchHighlightList = useSportStore((s) => s.onFetchHighlightList);
  const fetchCategories = useSportStore((s) => s.onFetchHighlightCategories);

  const latestMatch = finishedMatches?.[0];

  useEffect(() => {
    fetchFinished();
  }, [fetchFinished]);

  // 하이라이트: PC 와 같은 순서 (목록 → 카테고리)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchHighlightList();
      if (!cancelled) fetchCategories(latestMatch);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchHighlightList, fetchCategories, latestMatch]);

  return useMemo(() => {
    // 하이라이트: 카테고리 영상 → TheSportsDB 하이라이트, 같은 영상은 한 번만 (PC 와 동일)
    const seen = new Set();
    const highlights = [
      ...(categories || []).filter((c) => c.video?.id?.videoId).map((c) => c.video),
      ...(highlightList || []),
    ]
      .filter((v) => v?.id?.videoId && !seen.has(v.id.videoId) && seen.add(v.id.videoId))
      .map((v) => ({ id: v.id.videoId, title: decodeHtml(v.snippet?.title), image: ytThumb(v) }));

    return [
      {
        id: "replay",
        title: "경기 다시보기",
        items: REPLAY_LEAGUES.map((l) => ({ id: l.id, title: l.league, image: leagueThumb(l) })),
      },
      { id: "highlights", title: "하이라이트", items: highlights },
      {
        id: "upcoming",
        title: "예정된 경기",
        items: upcomingMatches()
          .slice(0, 8)
          .map((m) => ({ id: m.id, title: matchTitle(m), image: m.image })),
      },
      {
        id: "series",
        title: "추천 시리즈",
        items: SPORT_SERIES_DATA.map((s) => ({ id: s.id, title: s.title, image: s.poster })),
      },
      {
        id: "teams",
        title: "관심있는 구단",
        // [수정] TV 관심있는 구단: 배경 없는 뱃지 (파일이 아직 없으면 칩 로고로 대체)
        items: SPORT_TEAMS.map((t) => ({ id: t.id, title: t.shortName, image: t.banner, logo: t.badge || t.logo, logoFallback: t.logo })),
      },
    ].filter((row) => row.items.length > 0);
  }, [categories, highlightList]);
};

export const TvSportHome = ({ onMenu }) => {
  const rows = useTvSportRows();
  const [playing, setPlaying] = useState(null); // [추가] 재생 중인 하이라이트 { id, title }

  // [추가] 카드를 눌렀을 때
  // - 관심있는 구단 → 그 구단 화면 (팀 팔로우 버튼 · 팀 영상)
  // - 하이라이트 → 그 영상을 화면 가득 바로 재생 ("← 뒤로" 로 닫기)
  const handleItem = (rowId, item) => {
    if (rowId === "teams") onMenu?.(`team:${item.id}`);
    if (rowId === "highlights") setPlaying({ id: item.id, title: item.title });
  };
  return (
    <>
      <TvBrowseScreen menu="스포츠" onMenu={onMenu} rows={rows} bg={TV_SPORT_BG} onItem={handleItem} />
      <TvPlayer videoId={playing?.id} title={playing?.title} onClose={() => setPlaying(null)} />
    </>
  );
};

export default TvSportHome;
