import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { useTeamStore } from "../../store/useTeamStore";
import { getTeamById } from "../../data/sportTeams";
import { LIVE_MATCH, LIVE_OTHER_MATCHES } from "../../data/mockLiveMatch";
import { TeamHero } from "./SportHero";

// =====================================================================
// 라이브 상세 (/sport/match/:id) — 시안: 라이브 상세.pdf
// 1. 팀 히어로 (팔로우한 경기 팀 → 없으면 원정팀)        ← SportHero 의 TeamHero 재사용
//    (하단 LIVE 배너는 App 의 PromoBanner 가 그대로 표시)
// 2. 왼쪽 큰 화면(라이브 영상 + 경기 정보) / 오른쪽 다른 라이브 경기 목록  ← 상세(SportDetail) 레이아웃 재사용
// 3. 탭: 중계 · 라인업 · 기록 · 채팅
//    - 라인업: 팀별 포메이션 + 감독, 경기장 위 선발 11명, 후보선수 2열
// - 데이터: data/mockLiveMatch.js (영상은 짧은 하이라이트 클립 → 없으면 TheSportsDB 하이라이트)
// =====================================================================

const FALLBACK_THUMB = "/images/matches/matches-bg.png";
const TABS = [
  { key: "commentary", label: "중계" },
  { key: "lineup", label: "라인업" },
  { key: "stats", label: "기록" },
  { key: "chat", label: "채팅" },
];

const halfLabel = (minute) => (minute > 45 ? `후반 ${minute}'` : `전반 ${minute}'`);

// 선수 사진 (없으면 등번호 원)
const PlayerPhoto = ({ player, className }) => {
  const [failed, setFailed] = useState(false);
  return player.photo && !failed ? (
    <img className={className} src={player.photo} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className={`${className} is-empty`} aria-hidden="true">{player.num}</span>
  );
};

// ---------- 라인업: 팀 머리 (로고 · 이름 포메이션 · 감독) ----------
const LineupHead = ({ team, lineup }) => (
  <div className="sport-lineup-head">
    <img src={team.logo} alt="" />
    <h3>{team.shortName} {lineup.formation}</h3>
    <p><span>감독</span> {lineup.coach}</p>
  </div>
);

// ---------- 라인업: 경기장 + 선발 11명 ----------
const Pitch = ({ team, lineup }) => (
  <div className="sport-pitch" role="img" aria-label={`${team.shortName} 선발 ${lineup.formation}`}>
    <div className="sport-pitch-field" aria-hidden="true">
      <span className="sport-pitch-box top" />
      <span className="sport-pitch-line" />
      <span className="sport-pitch-circle" />
      <span className="sport-pitch-box bottom" />
    </div>
    <ul className="sport-pitch-players">
      {lineup.starters.map((player) => (
        <li key={player.num} style={{ left: `${player.x}%`, top: `${player.y}%` }} title={`${player.num} ${player.name}`}>
          <PlayerPhoto player={player} className="sport-pitch-photo" />
          <span className="sport-pitch-label"><b>{player.num}</b> {player.pos}</span>
        </li>
      ))}
    </ul>
  </div>
);

// ---------- 탭: 라인업 ----------
const LineupPanel = ({ teams }) => (
  <div className="sport-lineup">
    {teams.map(({ team, lineup }) => (
      <div className="sport-lineup-team" key={team.id}>
        <LineupHead team={team} lineup={lineup} />
        <Pitch team={team} lineup={lineup} />
      </div>
    ))}

    <h3 className="sport-subs-title">후보선수</h3>
    <div className="sport-subs">
      {teams.map(({ team, lineup }) => (
        <div className="sport-subs-col" key={team.id}>
          <p className="sport-subs-team"><img src={team.logo} alt="" />{team.shortName}</p>
          <ul>
            {lineup.subs.map((player) => (
              <li key={`${player.num}-${player.name}`}>
                <PlayerPhoto player={player} className="sport-subs-photo" />
                <b>{player.num}</b>
                <span>{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// ---------- 탭: 중계 ----------
const EVENT_ICON = { goal: "⚽", card: "🟨", sub: "⇄", chance: "◎", info: "•" };
const CommentaryPanel = ({ events }) => (
  <ol className="sport-commentary">
    {events.map((event, index) => {
      const team = event.team ? getTeamById(event.team) : null;
      return (
        <li key={index} className={`is-${event.type}`}>
          <span className="sport-commentary-min">{event.minute}'</span>
          <span className="sport-commentary-icon" aria-hidden="true">{EVENT_ICON[event.type] || "•"}</span>
          {team && <img className="sport-commentary-team" src={team.logo} alt={team.shortName} />}
          <p>{event.text}</p>
        </li>
      );
    })}
  </ol>
);

// ---------- 탭: 기록 ----------
const StatsPanel = ({ stats, home, away }) => (
  <div className="sport-stats">
    <div className="sport-stats-teams">
      <span><img src={home.logo} alt="" />{home.shortName}</span>
      <span>{away.shortName}<img src={away.logo} alt="" /></span>
    </div>
    <ul>
      {stats.map((row) => {
        const total = row.home + row.away || 1;
        const homeWin = row.home > row.away, awayWin = row.away > row.home;
        return (
          <li key={row.label}>
            <div className="sport-stats-values">
              <b className={homeWin ? "is-lead" : ""}>{row.home}{row.unit || ""}</b>
              <span>{row.label}</span>
              <b className={awayWin ? "is-lead" : ""}>{row.away}{row.unit || ""}</b>
            </div>
            <div className="sport-stats-bars" aria-hidden="true">
              <span className={`home${homeWin ? " is-lead" : ""}`}><i style={{ width: `${(row.home / total) * 100}%` }} /></span>
              <span className={`away${awayWin ? " is-lead" : ""}`}><i style={{ width: `${(row.away / total) * 100}%` }} /></span>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

// ---------- 탭: 채팅 (이 화면에서만 유지되는 데모) ----------
const ChatPanel = ({ seed }) => {
  const [messages, setMessages] = useState(seed);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { id: Date.now(), user: "나", text: value, mine: true }]);
    setText("");
  };

  return (
    <div className="sport-chat">
      <ul className="sport-chat-list" ref={listRef} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.mine ? "is-mine" : ""}>
            <b>{m.user}</b>
            <p>{m.text}</p>
          </li>
        ))}
      </ul>
      <form className="sport-chat-form" onSubmit={send}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="응원 메시지를 남겨 보세요"
          maxLength={120}
          aria-label="채팅 메시지"
        />
        <button type="submit" disabled={!text.trim()}>보내기</button>
      </form>
    </div>
  );
};

const SportLivePage = () => {
  const match = LIVE_MATCH;
  const home = getTeamById(match.homeId);
  const away = getTeamById(match.awayId);

  const favorites = useTeamStore((state) => state.favorites);
  // 영상: 짧은 MLS 하이라이트 클립(YouTube) → 없으면 TheSportsDB 하이라이트 (홈 "라이브" 카드와 같은 영상)
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);
  const highlightList = clips.length > 0 ? clips : sdbVideos;
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [tab, setTab] = useState("lineup");
  const [currentId, setCurrentId] = useState(match.id);

  // 히어로 팀: 이 경기 팀 중 팔로우한 팀 → 없으면 원정팀
  const heroTeam = [away, home].find((t) => favorites.includes(t.id)) || away;

  // 왼쪽 큰 화면 + 오른쪽 목록 (영상은 TheSportsDB 하이라이트를 순서대로 배정)
  const items = useMemo(() => {
    const videoAt = (i) => highlightList?.[i];
    const main = {
      id: match.id,
      title: `${home.shortName} ${match.score.home} : ${match.score.away} ${away.shortName}`,
      sub: away.enName,
      note: away.shortName,
      video: videoAt(0),
    };
    const others = LIVE_OTHER_MATCHES.map((m, i) => {
      const team = getTeamById(m.homeId);
      return {
        id: m.id,
        title: `${team?.shortName} VS ${away.shortName}`,
        sub: halfLabel(m.minute),
        note: `${team?.name} vs ${away.name}`,
        video: videoAt(i + 1),
      };
    });
    return [main, ...others];
  }, [highlightList, match, home, away]);

  const current = items.find((item) => item.id === currentId) || items[0];
  const list = items.filter((item) => item.id !== current.id);
  const thumbOf = (item) => item.video?.snippet?.thumbnails?.high?.url || FALLBACK_THUMB;
  const lineupTeams = [away, home].map((team) => ({ team, lineup: match.lineups[team.id] }));

  return (
    <main className="sport-home sport-detail-page sport-live-page">
      <TeamHero team={heroTeam} />

      {/* ===== 라이브 영상 + 다른 경기 ===== */}
      <section className="sport-detail sport-live-stage" aria-label="라이브 중계">
        <div className="inner">
          <div className="sport-detail-layout">
            <article className="sport-detail-stage">
              <div className="sport-detail-player">
                {current.video ? (
                  <iframe
                    key={current.video.id.videoId}
                    src={`https://www.youtube.com/embed/${current.video.id.videoId}?autoplay=1&mute=1&rel=0&playsinline=1`}
                    title={current.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img src={thumbOf(current)} alt="" />
                )}
              </div>
              <div className="sport-detail-info">
                <p className="sport-live-info-title">
                  <span className="sport-live-info-badge"><i aria-hidden="true" />LIVE</span>
                  {current.title}
                </p>
                <p className="sport-live-info-sub">{current.sub}</p>
                <p className="sport-live-info-note">{current.note}</p>
              </div>
            </article>

            <ul className="sport-detail-list" aria-label="다른 라이브 경기">
              {list.map((item) => (
                <li key={item.id}>
                  <button type="button" className="sport-detail-item" onClick={() => setCurrentId(item.id)}>
                    <span className="sport-detail-thumb">
                      <img src={thumbOf(item)} alt="" loading="lazy" />
                      <span className="sport-detail-play" aria-hidden="true">▶</span>
                    </span>
                    <span className="sport-detail-text">
                      <span className="sport-detail-title">{item.title}</span>
                      <span className="sport-detail-meta">{item.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== 탭: 중계 · 라인업 · 기록 · 채팅 ===== */}
      <section className="sport-live-tabs-section" aria-label="경기 정보">
        <div className="sport-live-tabs" role="tablist" aria-label="경기 정보 탭">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`sport-live-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="sport-live-panel"
              className={`sport-live-tab${tab === t.key ? " is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="inner sport-live-panel" role="tabpanel" id="sport-live-panel" aria-labelledby={`sport-live-tab-${tab}`}>
          {tab === "commentary" && <CommentaryPanel events={match.commentary} />}
          {tab === "lineup" && <LineupPanel teams={lineupTeams} />}
          {tab === "stats" && <StatsPanel stats={match.stats} home={home} away={away} />}
          {tab === "chat" && <ChatPanel seed={match.chat} />}
        </div>
      </section>

      <div className="inner sport-live-back-wrap">
        <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
      </div>
    </main>
  );
};

export default SportLivePage;
