import React, { useEffect, useMemo, useState } from "react";
import { useSportStore } from "../../store/useSportStore";
import { useTeamStore } from "../../store/useTeamStore";
import { useAuthStore } from "../../store/useAuthStore";
import { CONFERENCES } from "../../data/sportTeams";
import { conferenceRows, teamInfo } from "../sport/standingsUtils";
import { getMockLiveMatch, MOCK_LIVE_IDS } from "../sport/liveMatchAdapter";
import { decodeHtml, ytThumb } from "../sport/sportUtils";
import StarIcon from "../sport/StarIcon";
import TeamBadge from "../sport/TeamBadge";
import TvPlayer from "./TvPlayer";

// TV 관심구단 화면 (1920 × 1080) — 스타일: TV.scss (.tv-team)
// - 위: 구단 히어로 (PC 팔로우 구단 히어로와 같은 데이터)
//   구단 배너 + 가운데 뱃지(배경 없이 402 × 402) · 왼쪽 구단명 · 전적 · 팀 팔로우 · LIVE(경기 중일 때만) · 설명
// - 아래: 그 팀 영상만 (명장면 모음 → 경기 하이라이트 → 인터뷰(있으면))
//   · 영상은 useSportStore.onFetchTeamVideos (YouTube 에서 팀 이름으로 검색 · 6시간 캐시)
// - 왼쪽 메뉴의 관심구단 → 팀 이름 · 스포츠 홈 "관심있는 구단" 카드로 들어옴 (TvPreview.jsx)

const ROWS = [
  { key: "goals", title: (t) => `${t.name} 명장면 모음`, desc: "선수들의 빛나는 활약상과 짜릿한 순간들을 살펴보세요.", label: "하이라이트" },
  { key: "recaps", title: (t) => `${t.name} 경기 하이라이트`, desc: "놓친 경기를 핵심 장면으로 빠르게 확인하세요.", label: "경기 하이라이트" },
  { key: "interviews", title: (t) => `${t.name} 인터뷰`, desc: "선수와 감독이 직접 전하는 이야기를 들어보세요.", label: "인터뷰" },
];

// "1:02" · "1:02:03" → "1분" (1분 미만도 1분 · PC 하이라이트 카드와 같은 표기)
const minutesText = (durationText = "") => {
  const parts = String(durationText).split(":").map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return "";
  const sec = parts.reduce((acc, v) => acc * 60 + v, 0);
  return sec > 0 ? `${Math.max(1, Math.round(sec / 60))}분` : "";
};

// 이 팀이 지금 경기 중인지 (PC 라이브 섹션과 같은 기준: 실제 라이브 경기 → 없으면 목업 라이브 경기)
const useTeamLive = (teamId) => {
  const liveMatches = useSportStore((s) => s.liveMatches);
  const fetchLive = useSportStore((s) => s.onFetchLiveMatches);
  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  return useMemo(() => {
    if (liveMatches?.length > 0) {
      return liveMatches.some((m) => [m.homeTeam, m.awayTeam].some((t) => teamInfo(t)?.id === teamId));
    }
    return MOCK_LIVE_IDS.map(getMockLiveMatch).some((m) => m && (m.homeId === teamId || m.awayId === teamId));
  }, [liveMatches, teamId]);
};

export const TvTeam = ({ team }) => {
  const favorites = useTeamStore((s) => s.favorites);
  const toggleFavorite = useTeamStore((s) => s.toggleFavorite);
  const standings = useSportStore((s) => s.standings);
  const fetchStandings = useSportStore((s) => s.onFetchStandings);
  const videos = useSportStore((s) => s.teamVideos[team.id]);
  const fetchVideos = useSportStore((s) => s.onFetchTeamVideos);
  const loggedOut = useAuthStore((s) => s.authReady && !s.user);
  const live = useTeamLive(team.id);
  const [playing, setPlaying] = useState(null); // [추가] 재생 중인 영상 (카드 item)

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  useEffect(() => {
    fetchVideos(team);
  }, [fetchVideos, team]);

  const following = favorites.includes(team.id);

  // 컨퍼런스 순위 · 전적 (PC 히어로와 같은 계산)
  const recordText = useMemo(() => {
    const rows = conferenceRows(standings, team.conference);
    const index = rows.findIndex(({ info }) => info?.id === team.id);
    const conf = CONFERENCES[team.conference];
    if (index < 0) return conf;
    const r = rows[index].row;
    return `${r.won ?? 0}승 ${r.draw ?? 0}무 ${r.lost ?? 0}패 · ${conf} ${index + 1}위`;
  }, [standings, team]);

  const rows = useMemo(
    () =>
      ROWS.map((row) => ({
        ...row,
        items: (videos?.[row.key] || [])
          .filter((v) => v?.id?.videoId)
          .map((v) => ({
            id: v.id.videoId,
            title: decodeHtml(v.snippet?.title),
            desc: decodeHtml(v.snippet?.description),
            image: ytThumb(v),
            label: row.label,
            meta: [row.label, minutesText(v.durationText)].filter(Boolean).join(" · "),
          })),
      })).filter((row) => row.items.length > 0),
    [videos]
  );

  const heroStyle = team.banner
    ? { backgroundImage: `url(${team.banner})`, backgroundColor: team.color }
    : { backgroundImage: `linear-gradient(135deg, ${team.color} 0%, rgba(0, 0, 0, 0.85) 100%)` };

  // 카드에 포커스가 오면 화면 안에 보이도록 위아래 · 옆으로 이동
  const handleFocus = (e) => e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });

  return (
    <main className="tv-screen tv-team" style={{ "--team-color": team.color }}>
      <section className="tv-team-hero" aria-label={`${team.name} 관심구단`}>
        <div className="tv-team-hero-bg" style={heroStyle} aria-hidden="true" />
        <div className="tv-team-hero-overlay" aria-hidden="true" />

        <div className="tv-team-info">
          <h1 className="tv-team-name">{team.name}</h1>
          <p className="tv-team-record">{recordText}</p>

          <div className="tv-team-actions">
            <button
              type="button"
              className={`tv-team-follow${following ? " is-on" : ""}`}
              data-tv-autofocus
              aria-pressed={following}
              onFocus={handleFocus}
              onClick={() => toggleFavorite(team.id)}
            >
              <StarIcon filled={following} size={16} />
              {following ? "팔로잉" : "팀 팔로우"}
            </button>

            {/* LIVE: 별표(팔로우)한 팀이 경기 중일 때만 (PC 라이브 표시와 같은 크기) */}
            {following && live && (
              <span className="tv-team-live">
                <img src="/icons/live/live-icon.svg" alt="" aria-hidden="true" />
                LIVE
              </span>
            )}
          </div>

          <p className="tv-team-desc">
            팀 {team.name}의 모든 순간을 Apple TV에서. 실시간 경기와 하이라이트, 다시보기까지 한곳에서 즐겨보세요.
          </p>
        </div>

        <TeamBadge className="tv-team-badge" src={team.badge} fallback={team.logo} label={team.shortName} />
      </section>

      <div className="tv-team-body">
        {rows.map((row) => (
          <section key={row.key} className="tv-team-row">
            <h2 className="tv-team-row-title">
              {row.title(team)}
              <img src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
            </h2>
            <p className="tv-team-row-desc">{row.desc}</p>

            <div className="tv-team-track">
              {row.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="tv-team-card"
                  data-gate={loggedOut ? "watch" : undefined}
                  onFocus={handleFocus}
                  onClick={() => setPlaying(item)}
                >
                  <img className="tv-team-thumb" src={item.image} alt="" loading="lazy" />
                  <span className="tv-team-card-text">
                    <strong className="tv-team-card-title">{item.title}</strong>
                    {item.desc && <span className="tv-team-card-desc">{item.desc}</span>}
                    <span className="tv-team-card-meta">
                      <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
                      {item.meta}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {rows.length === 0 && (
          <p className="tv-team-empty" role="status">
            {videos ? "이 팀의 영상을 찾지 못했어요." : "영상을 불러오는 중입니다…"}
          </p>
        )}
      </div>

      {/* [추가] 카드를 누르면 그 영상을 화면 가득 바로 재생 · "← 뒤로" 로 닫기 */}
      <TvPlayer
        video={playing}
        related={rows.flatMap((row) => row.items)} // 끝 화면 "하이라이트" 줄: 이 팀 영상
        onClose={() => setPlaying(null)}
      />
    </main>
  );
};

export default TvTeam;
