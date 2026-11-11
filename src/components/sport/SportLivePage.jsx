import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import { useAuthStore } from "../../store/useAuthStore";
import { openSubscribeGate } from "../../utils/subscribeGate"; // [추가] 로그인 전 신고 아이콘 막기
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSportStore, playerPhotoKey } from "../../store/useSportStore";
import { useTeamStore } from "../../store/useTeamStore";
import { getTeamById } from "../../data/sportTeams";
// [삭제] 라이브 상세에서는 히어로를 보여 주지 않음 (SportHero · TeamHero import 제거)
import { getMockLiveMatch, MOCK_LIVE_IDS, buildFromSportsDb, liveRowToEvent, toTeam } from "./liveMatchAdapter";
import { SportBack } from "./SportBack";
import TeamBadgeImg from "./TeamBadge"; // [추가] 팀 뱃지 (배경 없이)
import ChatReportSheet from "./ChatReportSheet"; // [추가] 채팅 신고 팝업 (UI)
import { showToast } from "../../utils/toast"; // [추가] 이미 신고한 메시지 안내

// =====================================================================
// 라이브 상세 (/sport/match/:id) — 시안: 라이브 상세.pdf
// 1. [수정] 히어로 없음 → 들어오면 바로 라이브 영상(상세 영상)으로 (히어로 [경기 정보] 로 오면 중계 · 라인업 · 기록 탭으로)
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
  { key: "stats", label: "기록" }
];

const halfLabel = (minute) => (minute > 45 ? `후반 ${minute}'` : `전반 ${minute}'`);

// 선수 사진 (없으면 등번호 원)
// - [추가] 사진이 없으면 TheSportsDB 에서 선수 프로필을 찾아옴 (선수 id · 영문 이름 enName + 팀 영문 이름)
//   · 못 찾으면 지금처럼 등번호 원
const PlayerPhoto = ({ player, team, className }) => {
  const [failed, setFailed] = useState(false);
  const lookup = { playerId: player.playerId, enName: player.enName, teamName: team?.enName || team?.name };
  const canLookup = !player.photo && Boolean(lookup.playerId || lookup.enName);
  const key = canLookup ? playerPhotoKey(lookup) : "";
  const apiPhoto = useSportStore((state) => (key ? state.playerPhotos[key] : null));
  const fetchPhoto = useSportStore((state) => state.onFetchPlayerPhoto);
  useEffect(() => {
    if (canLookup) fetchPhoto(lookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const src = player.photo || apiPhoto;

  return src && !failed ? (
    <img className={className} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className={`${className} is-empty`} aria-hidden="true">{player.num}</span>
  );
};

// ---------- 팀 뱃지 (public/images/matches/{파일}.svg) ----------
// - 경기 카드에서 쓰는 뱃지 파일을 그대로 사용 (파일이 없으면 구단 칩 로고로 대체)
// [수정] 팀 뱃지: 배경 없이 뱃지만 (data/sportTeams.js 의 badge · MLS 외 팀은 API 엠블럼)
const TeamBadge = ({ team, className }) => (
  <TeamBadgeImg src={team.badge || team.logo} fallback={team.logo} label={team.shortName} className={className} />
);

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
          <PlayerPhoto player={player} team={team} className="sport-pitch-photo" />
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
    // [수정] PC: 왼쪽 라인업(경기장) · 오른쪽 후보선수를 한 줄에 나란히 (sport-member.scss · 태블릿 · 휴대폰은 위아래 그대로)
    <div className="sport-lineup">
      <div className="sport-lineup-main">
      <div className="sport-lineup-team" key={selected.team.id}>
        <LineupHead team={selected.team} lineup={selected.lineup} />
        <Pitch team={selected.team} lineup={selected.lineup} />
      </div>
      {other && (
        <LineupHead team={other.team} lineup={other.lineup} onSelect={() => setSelectedId(other.team.id)} />
      )}
      </div>

      <div className="sport-lineup-bench">
      <h3 className="sport-subs-title">후보선수</h3>
      <div className="sport-subs">
        {teams.map(({ team, lineup }) => (
          <div className="sport-subs-col" key={team.id}>
            <p className="sport-subs-team"><TeamBadge team={team} />{team.shortName}</p>
            <ul>
              {lineup.subs.map((player) => (
                <li key={`${player.num}-${player.name}`}>
                  <PlayerPhoto player={player} team={team} className="sport-subs-photo" />
                  <b>{player.num}</b>
                  <span>{player.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

// ---------- 아이콘 (public/icons/live/) ----------
const ICON = (name) => `/icons/live/${name}.svg`;

// ---------- 스코어보드 팀 ----------
// [수정] 모든 팀 같은 방식: 배경(팀색 원 · 칩) 없이 뱃지만
const ScoreBadge = ({ team }) => (
  <span className="sport-scoreboard-badge">
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
    {/* [수정] PC: 왼쪽 스코어보드 / 오른쪽 중계 타임라인 (기록 탭과 같은 배치 · 태블릿 · 휴대폰은 위아래 그대로) */}
    <div className="sport-commentary-aside">
    <Scoreboard left={left} right={right} score={score} />
    </div>
    <div className="sport-commentary-main">
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
  </div>
);

// ---------- 탭: 기록 ----------
// 왼쪽 팀: 빨간 막대(오른쪽부터 채움) / 오른쪽 팀: 흰 막대(왼쪽부터 채움)
const StatsPanel = ({ match, stats, left, right, score }) => (
  <div className="sport-stats">
    {/* [수정] PC: 왼쪽 경기 제목 · 날짜 · 스코어보드 / 오른쪽 기록 (sport-member.scss · 태블릿 · 휴대폰은 위아래 그대로) */}
    <div className="sport-stats-aside">
    <div className="sport-stats-head">
      <h3>{match.title}</h3>
      <p>{match.date}</p>
    </div>
    <Scoreboard left={left} right={right} score={score} />
    </div>
    <div className="sport-stats-main">
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
  </div>
);

// ---------- 탭: 채팅 (Firestore 실시간) ----------
// - liveChats/{matchId}/messages 를 onSnapshot 으로 구독 → 다른 사용자 메시지가 바로 표시됨
// - 채팅 프로필: 처음 팔로우한 팀(favorites[0]) 로고로 자동 생성 (채팅에서만 사용)
//   팔로우한 팀이 없으면 기본 프로필 아이콘
// - 목업(seed) 메시지는 실시간 메시지 아래에 배경처럼 함께 표시
const CHAT_FILTERS = [
  { key: "all", label: "전체" },
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
];
const CHAT_LIMIT = 50; // 최근 50개만 구독
const SEND_GAP_MS = 1000; // 연속 전송 간격

const minutesSince = (date, now) => (date ? Math.max(0, Math.floor((now - date.getTime()) / 60000)) : 0);

// [추가] 채팅 시간 표시: 방금 전 → n분 전 → n시간 전 → 24시간이 지나면 n일 전 (1일 · 2일 …)
const chatTimeLabel = (minutes) => {
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
};

// 채팅 프로필 아바타 (팀 로고 or 기본 아이콘)
const ChatAvatar = ({ team }) =>
  team ? (
    <span className="sport-chat-avatar" style={{ backgroundColor: team.color }}>
      <TeamBadge team={team} />
    </span>
  ) : (
    <span className="sport-chat-avatar is-default">
      <img src="/icons/User.svg" alt="" />
    </span>
  );

const ChatPanel = ({ matchId, room, seed }) => {
  const user = useAuthStore((s) => s.user);
  const uid = auth.currentUser?.uid || null;
  // 채팅 전용 프로필 팀: 처음 팔로우한 팀
  const firstTeamId = useTeamStore((s) => s.favorites[0] || null);
  const profileTeam = firstTeamId ? getTeamById(firstTeamId) || null : null;

  const [live, setLive] = useState([]);
  const [filter, setFilter] = useState("all");
  const [text, setText] = useState("");
  const [alerts, setAlerts] = useState({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastSentRef = useRef(0);

  // "n분 전" 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // 실시간 구독 (로그인한 사용자만 — 보안 규칙에서 읽기는 로그인 필요)
  useEffect(() => {
    if (!uid || !matchId) {
      setLive([]);
      return undefined;
    }
    const q = query(
      collection(db, "liveChats", String(matchId), "messages"),
      orderBy("createdAt", "desc"),
      limit(CHAT_LIMIT)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLive(
          snap.docs.map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            return {
              id: d.id,
              uid: data.uid,
              user: data.name,
              team: data.teamId || null,
              text: data.text,
              createdAt: data.createdAt?.toDate?.() || null,
              likes: 0,
              realtime: true,
            };
          })
        );
        setError("");
      },
      () => setError("채팅을 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
    );
    return unsub;
  }, [uid, matchId]);

  // [수정] 입력한 시간순 (가장 최근 메시지가 맨 위 · 시안 순서) — 실시간 메시지와 예시 메시지를 섞어서 시간으로 정렬
  // - ageMs: 지금으로부터 얼마나 지났는지 (실시간: 보낸 시각 · 예시: minutesAgo)
  const messages = useMemo(() => {
    const realtime = live.map((m) => ({
      ...m,
      minutesAgo: minutesSince(m.createdAt, now),
      ageMs: m.createdAt ? Math.max(0, now - m.createdAt.getTime()) : 0,
      mine: m.uid === uid,
    }));
    const examples = seed.map((m, i) => ({ ...m, ageMs: (m.minutesAgo || 0) * 60000 + i })); // 같은 분이면 원래 순서
    return [...realtime, ...examples].sort((a, b) => a.ageMs - b.ageMs);
  }, [live, seed, now, uid]);

  const list = useMemo(() => {
    if (filter === "latest") return messages; // [수정] 이미 시간순 (최근 메시지가 위)
    if (filter === "popular") return [...messages].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return messages;
  }, [messages, filter]);

  const canChat = !!user && !!uid;

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !canChat || sending) return;
    if (Date.now() - lastSentRef.current < SEND_GAP_MS) {
      setError("너무 빨라요. 잠시 후 다시 보내주세요.");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "liveChats", String(matchId), "messages"), {
        uid,
        name: (user.name || "Apple 사용자").slice(0, 30),
        teamId: firstTeamId, // 처음 팔로우한 팀 → 다른 사람에게도 이 로고로 보임
        text: value.slice(0, 120),
        createdAt: serverTimestamp(),
      });
      lastSentRef.current = Date.now();
      setText("");
      setError("");
    } catch {
      setError("메시지를 보내지 못했어요. 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  };

  const timeLabel = (m) => chatTimeLabel(m.minutesAgo); // [수정] 24시간이 지나면 n일 전

  // [추가] 신고 팝업: 사이렌 버튼 → 사유 고르기 → [신고] → "신고가 접수되었습니다." (UI만 · 서버 전송 없음)
  const [reportTarget, setReportTarget] = useState(null);

  return (
    <div className="sport-chat">
      <div className="sport-chat-head">
        <h3>{room.title}</h3>
        <p>{room.users.toLocaleString()}명의 {(room.messages + live.length).toLocaleString()}개 이야기</p>
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
          // 실시간 메시지: 보낸 사람이 저장한 팀(처음 팔로우한 팀) / 내 메시지는 현재 프로필
          // 목업 메시지: 기존 팀 정보
          const team = m.mine ? profileTeam : m.team ? getTeamById(m.team) || null : null;
          return (
            <li key={m.id} className={m.mine ? "is-mine" : ""}>
              <ChatAvatar team={team} />
              <div className="sport-chat-body">
                <b>{m.user}</b>
                <p>{m.text}</p>
              </div>
              <div className="sport-chat-meta">
                <span>{timeLabel(m)} ·</span>
                <button
                  type="button"
                  className={`sport-chat-siren${alerts[m.id] ? " is-on" : ""}`}
                  aria-haspopup="dialog"
                  aria-label={alerts[m.id] ? `${m.user} 메시지 신고됨` : `${m.user} 메시지 신고`}
                  onClick={() =>
                    !useAuthStore.getState().user
                      ? openSubscribeGate("account") // [추가] 로그인 전에는 신고 막음
                      : alerts[m.id]
                        ? showToast("이미 신고한 메시지예요.")
                        : setReportTarget(m)
                  } // [수정] 바로 켜지 않고 신고 팝업 열기
                >
                  <img src={ICON("siren-icon")} alt="" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="sport-chat-error" role="alert">{error}</p>}

      {/* [추가] 채팅 신고 팝업 */}
      <ChatReportSheet
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={() => {
          setAlerts((prev) => ({ ...prev, [reportTarget.id]: true }));
          setReportTarget(null);
        }}
      />

      <form className="sport-chat-form" onSubmit={send}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canChat ? "채팅 참여하기" : "로그인 후 채팅에 참여할 수 있어요"}
          maxLength={120}
          disabled={!canChat}
          aria-label="채팅 메시지"
        />
        <button type="submit" disabled={!canChat || sending || !text.trim()} aria-label="보내기">
          <img src={ICON("light-500-top-arrow")} alt="" />
        </button>
      </form>
    </div>
  );
};

const isMockId = (id) => !id || MOCK_LIVE_IDS.includes(id);

// [수정] 라이브 상세 오른쪽 "다른 경기" 목록: 토론토 vs 내슈빌(sample) · 토론토 vs 휴스턴(l1) 만
// - 나머지 경기는 목록에서 빼고 아래 [예정된 경기 보러 가기 →] → 예정된 경기 상세(/sport/upcoming)
const LIVE_LIST_IDS = ["sample", "l1"];

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

  // 히어로 배너: 스포츠 홈과 같은 팀 (내가 고른 팀 → 처음 팔로우한 팀)
  // 영상: 짧은 MLS 하이라이트 클립(YouTube) → 없으면 TheSportsDB 하이라이트 (홈 "라이브" 카드와 같은 영상)
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);
  const highlightList = clips.length > 0 ? clips : sdbVideos;

  // [수정] 히어로 [경기 정보] 로 들어오면 (#match-info) 아래 중계 · 라인업 · 기록 탭으로 바로 스크롤
  // - 같은 경기 화면에서 다시 눌러도 동작하게 location.key 로 다시 실행
  const location = useLocation();
  const toInfo = location.hash === "#match-info";
  useEffect(() => {
    let timer = null;
    const frame = requestAnimationFrame(() => {
      if (!toInfo) {
        document.querySelector(".sport-live-stage")?.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
      // 히어로 · 영상 높이가 잡힌 다음 이동 (바로 하면 위치가 어긋남)
      timer = setTimeout(() => {
        document.getElementById("sport-live-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [routeId, toInfo, location.key]);

  const [tab, setTab] = useState("lineup");
  const [chatOpen, setChatOpen] = useState(false);
  // [추가] 채팅을 펼치면 왼쪽 영상과 같은 높이 (넘치는 메시지는 채팅 안에서 스크롤) → --chat-h
  const playerRef = useRef(null);
  const [playerH, setPlayerH] = useState(0);
  useEffect(() => {
    const el = playerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setPlayerH(Math.round(entry.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  });

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
      ? LIVE_LIST_IDS.filter((mid) => mid !== match.id).map(getMockLiveMatch).filter(Boolean).map((m) => {
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

  // 히어로: 팔로우한 팀이 있으면 그 팀 배너, 팔로우하지 않았으면 기본 배너 (스포츠 홈과 동일)
  // 채팅 프로필은 ChatPanel 안에서 "처음 팔로우한 팀" 으로 따로 정함

  const current = items[0];
  const list = items.slice(1);
  const thumbOf = (item) => item.video?.snippet?.thumbnails?.high?.url || FALLBACK_THUMB;
  // [수정] 경기장에 먼저 보일 팀: 경기마다 다른 팀 (예시 경기는 홈팀 · 시안 경기 · 실제 경기는 예전처럼 원정팀)
  const lineupOrder = match.lineupFirst === home.id ? [home, away] : [away, home];
  const lineupTeams = lineupOrder.map((team) => ({
    team,
    lineup: match.lineups[team.id] || { formation: "-", coach: "-", starters: [], subs: [] },
  }));

  return (
    <main className="sport-home sport-detail-page sport-live-page">
      {/* ===== 라이브 영상 + 채팅 + 다른 경기 ===== */}
      <section className="sport-detail sport-live-stage" aria-label="라이브 중계">
        <div className="inner">
          <SportBack />
          <div className="sport-detail-layout">
            <article className="sport-detail-stage">
              <div className="sport-detail-player" ref={playerRef}>
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

            <aside className="sport-live-sidebar">
              <div
                className={`sport-live-chat-card${chatOpen ? " is-open" : ""}`}
                style={playerH ? { "--chat-h": `${playerH}px` } : undefined}
              >
                <button
                  type="button"
                  className="sport-live-chat-toggle"
                  onClick={() => setChatOpen(prev => !prev)}
                  aria-expanded={chatOpen}
                  aria-label={chatOpen ? "채팅 접기" : "채팅 펼쳐 보기"}
                >
                  <span>채팅</span>
                  {/* [수정] 채팅 내려보기 아이콘 (펼치면 위로 뒤집힘) */}
                  <svg className="sport-live-chat-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {chatOpen ? (
                  <div className="sport-live-chat-content">
                    <ChatPanel
                      key={match.id}
                      matchId={match.id}
                      room={match.chatRoom}
                      seed={match.chat}
                    />
                  </div>
                ) : (
                  // [수정] 닫힌 채팅의 입력 칸 모양: 누르면 채팅이 펼쳐지고 바로 입력할 수 있게 입력칸에 포커스
                  <button
                    type="button"
                    className="sport-live-chat-preview"
                    onClick={() => {
                      setChatOpen(true);
                      // 펼친 채팅이 그려진 뒤 입력칸으로 (로그인 전이면 입력칸이 꺼져 있어 안내 문구만 보임)
                      requestAnimationFrame(() =>
                        requestAnimationFrame(() => {
                          const input = document.querySelector(".sport-live-chat-content .sport-chat-form input:not([disabled])");
                          input?.focus({ preventScroll: true });
                        })
                      );
                    }}
                  >
                    실시간 채팅에 참여해보세요
                  </button>
                )}
              </div>

              <ul className="sport-detail-list sport-live-video-list">
                {/* 기존 list.map(...) 코드 유지 */}
              </ul>
              <ul className="sport-detail-list" aria-label="다른 라이브 경기">
                {list.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="sport-detail-item" onClick={() => navigate(`/sport/match/${item.id}`)}>
                      <span className="sport-detail-thumb">
                        <img src={thumbOf(item)} alt="" loading="lazy" />
                        <span className="sport-detail-play" aria-hidden="true"><img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" /></span>
                      </span>
                      <span className="sport-detail-text">
                        <span className="sport-detail-title">{item.title}</span>
                        <span className="sport-detail-meta">{item.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {/* [수정] 그 밖의 경기: 예정된 경기 상세(/sport/upcoming)로 이동 */}
              {isMock && (
                <Link className="sport-live-list-empty" to="/sport/upcoming">
                  {/* 화살표: "← 스포츠 홈으로" 와 같은 "←" 를 좌우로 뒤집어 사용 (같은 모양 · 반대 방향) */}
                  예정된 경기 보러 가기 <span className="sport-live-list-arrow" aria-hidden="true">←</span>
                </Link>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* ===== 탭: 중계 · 라인업 · 기록===== */}
      <section className="sport-live-tabs-section" id="sport-live-info" aria-label="경기 정보">
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
        </div>
      </section>


    </main>
  );
};

export default SportLivePage;
