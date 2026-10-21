import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS, CONFERENCES } from "../../data/sportTeams";
import { PLAYER_RANKS } from "../../data/mockPlayerRanks";
import { conferenceRows, clubOf } from "./standingsUtils";
import SportHero from "./SportHero";

// =====================================================================
// 리그 순위 상세 (/sport/standings)
// - 스포츠 홈 "리그 순위" 의 "전체 보기"로 진입
// - 팀 순위: 동부 / 서부 컨퍼런스 탭 → 컨퍼런스 전체 구단 표
// - 선수 순위: 득점왕 / 도움왕 / 공격포인트 탭 → 상위 3명 카드
// =====================================================================

const SEASON = 2026;
const COLUMNS = [
  { key: "points", label: "승점" },
  { key: "playedGames", label: "경기" },
  { key: "won", label: "승" },
  { key: "draw", label: "무" },
  { key: "lost", label: "패" },
];

const teamName = (id) => SPORT_TEAMS.find((t) => t.id === id)?.name || "";
const pad2 = (n) => String(n).padStart(2, "0");

// 공통 탭 (키보드 ← → 이동 지원)
const Tabs = ({ id, items, value, onChange, label }) => {
  const onKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const index = items.findIndex((item) => item.key === value);
    const next = items[(index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
    onChange(next.key);
    document.getElementById(`${id}-tab-${next.key}`)?.focus();
  };
  return (
    <div className="sport-standings-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`${id}-tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`${id}-panel`}
            tabIndex={selected ? 0 : -1}
            className={`sport-standings-tab${selected ? " is-active" : ""}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

// 선수 사진 (이미지가 없으면 이름 첫 글자)
const PlayerPhoto = ({ player }) => {
  const [failed, setFailed] = useState(false);
  return failed || !player.photo ? (
    <span className="sport-player-photo sport-player-photo--empty" aria-hidden="true">{player.name.slice(0, 1)}</span>
  ) : (
    <img className="sport-player-photo" src={player.photo} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
};

const SportStandingsPage = () => {
  const standings = useSportStore((state) => state.standings);
  const fetchStandings = useSportStore((state) => state.onFetchStandings);
  const [conference, setConference] = useState("east");
  const [playerTab, setPlayerTab] = useState(PLAYER_RANKS[0].key);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const rows = conferenceRows(standings, conference);
  const ranking = PLAYER_RANKS.find((r) => r.key === playerTab) || PLAYER_RANKS[0];
  const conferenceTabs = Object.entries(CONFERENCES).map(([key, label]) => ({ key, label }));

  return (
    <main className="sport-home sport-standings-page">
      <SportHero />

      <section className="sport-standings" aria-labelledby="sport-standings-page-title">
        <div className="inner">
          {/* 페이지 제목 */}
          <div className="sport-standings-head">
            <h2 className="sport-standings-title" id="sport-standings-page-title">{SEASON} 정규시즌 리그 순위</h2>
            <p className="sport-standings-sub">동부와 서부의 전체 구단 순위를 확인하세요</p>
          </div>

          {/* 팀 순위 */}
          <div className="sport-standings-block">
            <h3 className="sport-standings-block-title">팀 순위</h3>
            <Tabs id="sport-team-rank" label="컨퍼런스 선택" items={conferenceTabs} value={conference} onChange={setConference} />

            <div className="sport-standings-table-wrap" role="tabpanel" id="sport-team-rank-panel" aria-labelledby={`sport-team-rank-tab-${conference}`}>
              <table className="sport-standings-table">
                <caption className="sport-sr-only">{CONFERENCES[conference]} 전체 구단 순위</caption>
                <colgroup>
                  <col className="col-rank" />
                  <col className="col-club" />
                  {COLUMNS.map((c) => <col key={c.key} className="col-stat" />)}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">순위</th>
                    <th scope="col">구단</th>
                    {COLUMNS.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={2 + COLUMNS.length} className="sport-standings-empty">순위 정보를 불러오는 중입니다.</td></tr>
                  ) : rows.map((item, index) => {
                    const { key, logo, name } = clubOf(item);
                    return (
                      <tr key={key}>
                        <td className="rank">{pad2(index + 1)}</td>
                        <th scope="row">
                          <span className="sport-standings-club">
                            {logo && <img src={logo} alt="" loading="lazy" />}
                            <span>{name}</span>
                          </span>
                        </th>
                        {COLUMNS.map((c) => <td key={c.key}>{item.row[c.key] ?? "—"}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 선수 순위 */}
          <div className="sport-standings-block">
            <h3 className="sport-standings-block-title">선수 순위</h3>
            <Tabs id="sport-player-rank" label="선수 순위 종류" items={PLAYER_RANKS} value={playerTab} onChange={setPlayerTab} />

            <ol className="sport-player-list" role="tabpanel" id="sport-player-rank-panel" aria-labelledby={`sport-player-rank-tab-${playerTab}`}>
              {ranking.players.map((player, index) => (
                <li className="sport-player-card" key={`${ranking.key}-${player.id}`}>
                  <PlayerPhoto player={player} />
                  <p className="sport-player-name">
                    <span className="sport-player-rank">{index + 1}위</span>
                    {player.name} / {teamName(player.teamId)}
                  </p>
                  <strong className="sport-player-value">{player.value}{ranking.unit}</strong>
                </li>
              ))}
            </ol>
          </div>

          <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
        </div>
      </section>
    </main>
  );
};

export default SportStandingsPage;
