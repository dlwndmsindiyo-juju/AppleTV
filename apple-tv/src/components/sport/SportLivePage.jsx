import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { useTeamStore } from "../../store/useTeamStore";
import { getTeamById } from "../../data/sportTeams";
import { TeamHero } from "./SportHero";
import { getMockLiveMatch, MOCK_LIVE_IDS, buildFromSportsDb, liveRowToEvent, toTeam } from "./liveMatchAdapter";

// =====================================================================
// 라이브 상세 (/sport/match/:id) — 시안: 라이브 상세.pdf
// 1. 팀 히어로 (팔로우한 경기 팀 → 없으면 원정팀)        ← SportHero 의 TeamHero 재사용
//    (하단 LIVE 배너는 App 의 PromoBanner 가 그대로 표시)
// 2. 왼쪽 큰 화면(라이브 영상 + 경기 정보) / 오른쪽 다른 라이브 경기 목록  ← 상세(SportDetail) 레이아웃 재사용
// 3. 탭: 중계 · 라인업 · 기록 · 채팅
//    - 라인업: 팀별 포메이션 + 감독, 경기장 위 선발 11명, 후보선수 2열
// - 데이터: 주소의 경기 id 로 결정 (liveMatchAdapter 가 모두 같은 모양으로 변환)
//   · sample / l1 ~ l7       → data/mockLiveMatch.js 목업
//   · 그 밖의 id(실제 경기)  → TheSportsDB livescore 한 줄 + lookup 4개(경기 · 라인업 · 타임라인 · 기록)
// - 영상은 짧은 하이라이트 클립 → 없으면 TheSportsDB 하이라이트
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

// ---------- 팀 뱃지 (public/images/matches/{파일}.svg) ----------
// - 경기 카드에서 쓰는 뱃지 파일을 그대로 사용 (파일이 없으면 구단 칩 로고로 대체)
const MATCH_BADGE_FILE = {
  atlanta: "atlanta", austin: "austin", cincinnati: "cincinnati", columbus: "columbus",
  dc: "DC", miami: "miami", minnesota: "minnesota", montreal: "montreal", nashville: "nashville",
  orlando: "orlando", "red-bulls": "redbull", "san-jose": "sanjose", seattle: "seattle",
  "st-louis": "st-louis", toronto: "toronto", vancouver: "vancouver",
};
const matchBadge = (team) =>
  MATCH_BADGE_FILE[team.id] ? `/images/matches/${MATCH_BADGE_FILE[team.id]}.svg` : team.logo;

const TeamBadge = ({ team, className }) => {
  const [failed, setFailed] = useState(false);
  const src = failed ? team.logo : matchBadge(team);
  // MLS 외 팀인데 뱃지 주소도 없으면 이름 첫 글자
  if (!src) {
    return <span className={`${className || ""} sport-badge-initial`} aria-hidden="true">{team.shortName?.[0]}</span>;
  }
  return (
    <img
      className={className}
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  );
};

// 데이터가 없는 탭 (API 가 아직 제공하지 않는 경기)
const EmptyPanel = ({ text }) => <p className="sport-live-empty">{text}</p>;

// ---------- 라인업: 팀 머리 (뱃지 · 이름 포메이션 · 감독) ----------
// - onSelect 가 있으면 버튼으로 동작 (누르면 그 팀 라인업으로 경기장 전환)
const LineupHead = ({ team, lineup, onSelect }) => {
  const body = (
    <>
      <TeamBadge team={team} className="sport-lineup-badge" />
      <h3>{team.shortName} {lineup.formation}</h3>
      <p><span>감독</span> {lineup.coach}</p>
    </>
  );
  return onSelect ? (
    <button type="button" className="sport-lineup-head is-button" onClick={onSelect} aria-label={`${team.shortName} 라인업 보기`}>
      {body}
    </button>
  ) : (
    <div className="sport-lineup-head">{body}</div>
  );
};

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
// 시안: [선택 팀 머리] → 경기장(선택 팀 선발) → [상대 팀 머리] → 후보선수 2열
// - 아래 상대 팀 머리를 누르면 그 팀이 위로 올라오고 경기장이 그 팀 선발로 바뀜
const LineupPanel = ({ teams }) => {
  const [selectedId, setSelectedId] = useState(teams[0].team.id);
  if (teams.every(({ lineup }) => !lineup?.starters?.length)) return <EmptyPanel text="라인업 정보가 아직 없습니다." />;
  const selected = teams.find(({ team }) => team.id === selectedId) || teams[0];
  const other = teams.find(({ team }) => team.id !== selected.team.id);

  return (
  <div className="sport-lineup">
    <div className="sport-lineup-team" key={selected.team.id}>
      <LineupHead team={selected.team} lineup={selected.lineup} />
      <Pitch team={selected.team} lineup={selected.lineup} />
    </div>
    {other && (
      <LineupHead team={other.team} lineup={other.lineup} onSelect={() => setSelectedId(other.team.id)} />
    )}

    <h3 className="sport-subs-title">후보선수</h3>
    <div className="sport-subs">
      {teams.map(({ team, lineup }) => (
        <div className="sport-subs-col" key={team.id}>
          <p className="sport-subs-team"><TeamBadge team={team} />{team.shortName}</p>
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
};

// ---------- 아이콘 (public/icons/live/) ----------
const ICON = (name) => `/icons/live/${name}.svg`;

// ---------- 스코어보드 팀 원 ----------
// - MLS 구단: 구단 칩 이미지(public/images/sport-team/{id}-chip.svg)를 원 전체에 꽉 채움
// - 그 밖의 팀: 팀색 원 + 가운데 뱃지 (기존 방식)
const ScoreBadge = ({ team }) =>
  getTeamById(team.id) ? (
    <span className="sport-scoreboard-badge is-chip">
      <img src={team.logo} alt="" />
    </span>
  ) : (
    <span className="sport-scoreboard-badge" style={{ backgroundColor: team.color }}>
      <TeamBadge team={team} />
    </span>
  );

// ---------- 중계 · 기록 공통: 스코어보드 ----------
// [팀 뱃지(팀색 원)] [점수] : [점수] [팀 뱃지]  · 점수 아래 팀 이름
const Scoreboard = ({ left, right, score }) => (
  <div className="sport-scoreboard" aria-label={`${left.shortName} ${score[left.id]} 대 ${score[right.id]} ${right.shortName}`}>
    <ScoreBadge team={left} />
    <div className="sport-scoreboard-score">
      <b>{score[left.id]}</b>
      <span>{left.shortName}</span>
    </div>
    <span className="sport-scoreboard-colon" aria-hidden="true" />
    <div className="sport-scoreboard-score">
      <b>{score[right.id]}</b>
      <span>{right.shortName}</span>
    </div>
    <ScoreBadge team={right} />
  </div>
);

// ---------- 탭: 중계 (가운데 시간 축 타임라인) ----------
// - 왼쪽 팀 이벤트는 왼쪽, 상대 팀 이벤트는 오른쪽 / 골은 빨간 원
const EventBody = ({ event }) => {
  if (event.type === "sub") {
    return (
      <span className="sport-tl-sub">
        <span><img src={ICON("green-up")} alt="교체 투입" />{event.in}</span>
        <span><img src={ICON("red-down")} alt="교체 아웃" />{event.out}</span>
      </span>
    );
  }
  if (event.type === "goal") {
    return (
      <span className="sport-tl-goal">
        <strong><img src={ICON("football-icon")} alt="" />GOAL! {event.player}</strong>
        {event.assist && <small>{event.assist}</small>}
      </span>
    );
  }
  const card = event.type === "red" ? "red-card" : "yellow-card";
  return (
    <span className="sport-tl-card">
      <img src={ICON(card)} alt="" />
      {event.player} {event.type === "red" ? "퇴장" : "경고"}
    </span>
  );
};

const CommentaryPanel = ({ events, left, right, score }) => (
  <div className="sport-commentary">
    <Scoreboard left={left} right={right} score={score} />
    {events.length === 0 && <EmptyPanel text="아직 중계 기록이 없습니다." />}
    <ol className="sport-timeline">
      {events.map((event, index) => {
        if (event.type === "half") {
          return (
            <li key={index} className="sport-tl-half">
              <b>{event.score[left.id]}</b>
              <span>{event.label}</span>
              <b>{event.score[right.id]}</b>
            </li>
          );
        }
        const side = event.team === left.id ? "is-left" : "is-right";
        return (
          <li key={index} className={`sport-tl-item ${side} is-${event.type}`}>
            <span className="sport-tl-min">{event.minute}</span>
            <div className="sport-tl-body"><EventBody event={event} /></div>
          </li>
        );
      })}
    </ol>
  </div>
);

// ---------- 탭: 기록 ----------
// 왼쪽 팀: 빨간 막대(오른쪽부터 채움) / 오른쪽 팀: 흰 막대(왼쪽부터 채움)
const StatsPanel = ({ match, stats, left, right, score }) => (
  <div className="sport-stats">
    <div className="sport-stats-head">
      <h3>{match.title}</h3>
      <p>{match.date}</p>
    </div>
    <Scoreboard left={left} right={right} score={score} />
    {stats.length === 0 && <EmptyPanel text="경기 기록이 아직 없습니다." />}
    <ul className="sport-stats-list">
      {stats.map((row) => {
        const l = row.values[left.id] ?? 0, r = row.values[right.id] ?? 0;
        const max = Math.max(l, r, 1);
        // 점유율처럼 합이 100 인 값은 그대로, 나머지는 큰 값 기준 비율
        const pct = (v) => (row.unit === "%" ? v : (v / max) * 100);
        return (
          <li key={row.label}>
            <span className="sport-stats-label">{row.label}</span>
            <div className="sport-stats-side is-left">
              <span className="sport-stats-bar"><i style={{ width: `${pct(l)}%` }} /></span>
              <b>{l}{row.unit || ""}</b>
            </div>
            <div className="sport-stats-side is-right">
              <span className="sport-stats-bar"><i style={{ width: `${pct(r)}%` }} /></span>
              <b>{r}{row.unit || ""}</b>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

// ---------- 탭: 채팅 (이 화면에서만 유지되는 데모) ----------
const CHAT_FILTERS = [
  { key: "all", label: "전체" },
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
];

const ChatPanel = ({ room, seed, myTeam }) => {
  const [messages, setMessages] = useState(seed);
  const [filter, setFilter] = useState("all");
  const [text, setText] = useState("");
  const [alerts, setAlerts] = useState({});

  const list = useMemo(() => {
    if (filter === "latest") return [...messages].sort((a, b) => a.minutesAgo - b.minutesAgo);
    if (filter === "popular") return [...messages].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return messages;
  }, [messages, filter]);

  const send = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [{ id: Date.now(), user: "나", team: myTeam.id, text: value, minutesAgo: 0, likes: 0, mine: true }, ...prev]);
    setText("");
  };

  const timeLabel = (m) => (m.minutesAgo < 1 ? "방금 전" : `${m.minutesAgo}분 전`);

  return (
    <div className="sport-chat">
      <div className="sport-chat-head">
        <h3>{room.title}</h3>
        <p>{room.users.toLocaleString()}명의 {(room.messages + messages.length - seed.length).toLocaleString()}개 이야기</p>
      </div>

      <div className="sport-chat-filters" role="group" aria-label="채팅 정렬">
        {CHAT_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`sport-chat-filter${filter === f.key ? " is-active" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="sport-chat-list" aria-live="polite">
        {list.map((m) => {
          const team = getTeamById(m.team) || myTeam;
          return (
            <li key={m.id} className={m.mine ? "is-mine" : ""}>
              <span className="sport-chat-avatar" style={{ backgroundColor: team.color }}>
                <TeamBadge team={team} />
              </span>
              <div className="sport-chat-body">
                <b>{m.user}</b>
                <p>{m.text}</p>
              </div>
              <div className="sport-chat-meta">
                <span>{timeLabel(m)} ·</span>
                <button
                  type="button"
                  className={`sport-chat-siren${alerts[m.id] ? " is-on" : ""}`}
                  aria-pressed={!!alerts[m.id]}
                  aria-label={alerts[m.id] ? `${m.user} 메시지 신고 취소` : `${m.user} 메시지 신고`}
                  onClick={() => setAlerts((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                >
                  <img src={ICON("siren-icon")} alt="" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="sport-chat-form" onSubmit={send}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="채팅 참여하기"
          maxLength={120}
          aria-label="채팅 메시지"
        />
        <button type="submit" disabled={!text.trim()} aria-label="보내기">
          <img src={ICON("light-500-top-arrow")} alt="" />
        </button>
      </form>
    </div>
  );
};

const isMockId = (id) => !id || MOCK_LIVE_IDS.includes(id);

// 오른쪽 목록 한 줄 (실제 라이브 경기)
const toListTeam = (t) => toTeam({ name: t?.shortName || t?.name, badge: t?.crest });

const SportLivePage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  // ---------- 경기 데이터 ----------
  const liveMatches = useSportStore((state) => state.liveMatches);
  const fetchLiveMatches = useSportStore((state) => state.onFetchLiveMatches);
  const details = useSportStore((state) => state.liveMatchDetails);
  const fetchDetail = useSportStore((state) => state.onFetchLiveMatchDetail);
  const isMock = isMockId(routeId);
  const liveRow = liveMatches.find((m) => String(m.id) === String(routeId));
  // TheSportsDB 경기만 lookup 상세가 있음 (football-data 로 대체된 경기는 점수 · 팀만 표시)
  const hasSportsDbDetail = !liveRow || Boolean(liveRow._league);

  // 실제 경기: 목록 + 상세를 2분마다 갱신 (TheSportsDB livescore 갱신 주기)
  useEffect(() => {
    if (isMock) return undefined;
    const load = () => { fetchLiveMatches(); if (hasSportsDbDetail) fetchDetail(routeId); };
    load();
    const timer = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isMock, routeId, hasSportsDbDetail, fetchLiveMatches, fetchDetail]);

  const match = useMemo(() => {
    if (isMock) return getMockLiveMatch(routeId);
    const saved = details[routeId];
    // 다른 경기 응답이 섞이지 않게 id 확인
    const detail = hasSportsDbDetail && (!saved?.event || String(saved.event.idEvent) === String(routeId)) ? saved : null;
    const event = liveRowToEvent(liveRow, detail?.event);
    return event ? buildFromSportsDb({ ...detail, event }) : null;
  }, [isMock, routeId, details, liveRow, hasSportsDbDetail]);

  const favorites = useTeamStore((state) => state.favorites);
  // 영상: 짧은 MLS 하이라이트 클립(YouTube) → 없으면 TheSportsDB 하이라이트 (홈 "라이브" 카드와 같은 영상)
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);
  const highlightList = clips.length > 0 ? clips : sdbVideos;
  useEffect(() => { window.scrollTo(0, 0); }, [routeId]);

  const [tab, setTab] = useState("lineup");

  // 오른쪽 "다른 라이브 경기": 목업 경기면 목업 목록, 실제 경기면 livescore 목록 (누르면 그 경기 상세로 이동)
  const items = useMemo(() => {
    const videoAt = (i) => highlightList?.[i];
    if (!match) return [];
    const home = match.teams[match.homeId];
    const away = match.teams[match.awayId];
    const main = {
      id: match.id,
      title: `${home.shortName} ${match.score.home} : ${match.score.away} ${away.shortName}`,
      sub: away.enName,
      note: away.shortName,
      video: videoAt(0),
    };
    const others = isMock
      ? MOCK_LIVE_IDS.filter((mid) => mid !== match.id).map(getMockLiveMatch).filter(Boolean).map((m) => {
          const mid = m.id;
          const h = m.teams[m.homeId], a = m.teams[m.awayId];
          return { id: mid, title: `${h.shortName} VS ${a.shortName}`, sub: m.minute ? halfLabel(m.minute) : "", note: `${h.name} vs ${a.name}` };
        })
      : liveMatches.filter((m) => String(m.id) !== String(match.id)).map((m) => {
          const h = toListTeam(m.homeTeam), a = toListTeam(m.awayTeam);
          const sc = m.score?.fullTime || {};
          return {
            id: String(m.id),
            title: `${h.shortName} ${sc.home ?? 0} : ${sc.away ?? 0} ${a.shortName}`,
            sub: m.minute ? halfLabel(m.minute) : m.competition?.name || "",
            note: `${h.name} vs ${a.name}`,
          };
        });
    return [main, ...others.map((o, i) => ({ ...o, video: videoAt(i + 1) }))];
  }, [highlightList, match, isMock, liveMatches]);

  // 실제 경기인데 아직 목록 · 상세가 오지 않았거나 경기가 끝나 목록에서 빠진 경우
  if (!match) {
    return (
      <main className="sport-home sport-detail-page sport-live-page">
        <div className="inner sport-live-back-wrap">
          <EmptyPanel text="경기 정보를 불러오는 중이거나 종료된 경기입니다." />
          <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
        </div>
      </main>
    );
  }

  const home = match.teams[match.homeId];
  const away = match.teams[match.awayId];
  // 팀 id 별 점수 (중계 · 기록 스코어보드)
  const finalScore = { [match.homeId]: match.score.home, [match.awayId]: match.score.away };

  // 히어로 팀: 이 경기 팀 중 팔로우한 팀 → MLS 구단(원정 → 홈) → 원정팀
  const heroTeam =
    [away, home].find((t) => favorites.includes(t.id)) ||
    [away, home].find((t) => getTeamById(t.id)) ||
    away;

  const current = items[0];
  const list = items.slice(1);
  const thumbOf = (item) => item.video?.snippet?.thumbnails?.high?.url || FALLBACK_THUMB;
  const lineupTeams = [away, home].map((team) => ({
    team,
    lineup: match.lineups[team.id] || { formation: "-", coach: "-", starters: [], subs: [] },
  }));

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
                  <button type="button" className="sport-detail-item" onClick={() => navigate(`/sport/match/${item.id}`)}>
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
          {tab === "commentary" && <CommentaryPanel events={match.commentary} left={away} right={home} score={finalScore} />}
          {tab === "lineup" && <LineupPanel key={match.id} teams={lineupTeams} />}
          {tab === "stats" && <StatsPanel match={match} stats={match.stats} left={away} right={home} score={finalScore} />}
          {tab === "chat" && <ChatPanel key={match.id} room={match.chatRoom} seed={match.chat} myTeam={heroTeam} />}
        </div>
      </section>

      <div className="inner sport-live-back-wrap">
        <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
      </div>
    </main>
  );
};

export default SportLivePage;
