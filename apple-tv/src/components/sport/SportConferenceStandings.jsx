import { useEffect, useState } from "react";
import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS, CONFERENCES } from "../../data/sportTeams";

// MLS 로고 (public/images/sport-team/mls-logo.svg 를 넣으면 이미지로, 없으면 텍스트 배지로 표시)
const MLS_LOGO = `${import.meta.env.BASE_URL}images/sport-team/mls-logo.svg`;

// 팀 이름 비교용 정규화: 악센트/FC·CF·SC/기호 제거 (예: "Atlanta United FC" = "Atlanta United")
const norm = (v = "") => String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\b(fc|cf|sc)\b/g, "").replace(/[^a-z0-9가-힣]/g, "");

// 순위 데이터의 팀 → data/sportTeams.js 의 구단 (한글 이름 · 로고 · 컨퍼런스)
const teamInfo = (team) => {
  if (!team) return null;
  if (team.id && SPORT_TEAMS.some((t) => t.id === team.id)) return SPORT_TEAMS.find((t) => t.id === team.id);
  const targets = [team.name, team.shortName, team.enName].map(norm).filter(Boolean);
  const exact = SPORT_TEAMS.find((item) =>
    [item.enName, item.name, item.shortName].map(norm).some((n) => n && targets.includes(n))
  );
  if (exact) return exact;
  // 한쪽이 다른 쪽을 포함하는 경우까지 허용 (짧은 이름 오매칭 방지로 6자 이상만)
  return SPORT_TEAMS.find((item) => {
    const n = norm(item.enName);
    return n.length >= 6 && targets.some((t) => t.includes(n) || n.includes(t));
  });
};

const COLUMNS = ["경기", "승", "무", "패", "승점"];

// 컨퍼런스 로고 (이미지가 없으면 텍스트 배지)
const LeagueLogo = () => {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="sport-conference-badge" aria-hidden="true">MLS</span>
  ) : (
    <img className="sport-conference-logo" src={MLS_LOGO} alt="" onError={() => setFailed(true)} />
  );
};

// 리그 순위 (MLS 동부 / 서부 컨퍼런스 상위 5팀)
export default function SportConferenceStandings() {
  const standings = useSportStore((state) => state.standings);
  const fetchStandings = useSportStore((state) => state.onFetchStandings);
  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  // 컨퍼런스별 상위 5팀 (승점 → 원래 순위 순)
  const rowsOf = (key) =>
    (standings || [])
      .map((row) => ({ row, info: teamInfo(row.team) }))
      .filter(({ row, info }) => (row.conference || info?.conference) === key)
      .sort((a, b) => (b.row.points ?? 0) - (a.row.points ?? 0) || (a.row.position ?? 0) - (b.row.position ?? 0))
      .slice(0, 5);

  return (
    <section className="sport-league sport-conferences" aria-labelledby="sport-standings-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-standings-title">리그 순위</h3>
          <a className="sport-more" href="https://www.mlssoccer.com/standings/" target="_blank" rel="noreferrer">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="sport-conference-grid">
          {Object.entries(CONFERENCES).map(([key, label]) => {
            const rows = rowsOf(key);
            return (
              <div className="sport-conference-card" key={key}>
                <h4 className="sport-conference-title">
                  <LeagueLogo />
                  {label}
                </h4>

                <div className="sport-conference-scroll">
                  <table className="sport-conference-table">
                    <caption className="sport-sr-only">{label} 상위 5개 구단 순위</caption>
                    <colgroup>
                      <col className="col-rank" />
                      <col className="col-club" />
                      {COLUMNS.map((c) => <col key={c} className="col-stat" />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col"><span className="sport-sr-only">순위</span></th>
                        <th scope="col">클럽</th>
                        {COLUMNS.map((c) => <th scope="col" key={c}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="sport-conference-empty">순위 정보를 불러오는 중입니다.</td>
                        </tr>
                      ) : rows.map(({ row, info }, index) => {
                        const logo = info?.logo || row.team?.crest;
                        const name = info?.shortName || row.team?.shortName || row.team?.name;
                        return (
                          <tr key={info?.id || row.team?.id || name}>
                            <td className="rank">{index + 1}</td>
                            <th scope="row">
                              <span className="sport-conference-club">
                                {logo && <img src={logo} alt="" loading="lazy" />}
                                <span>{name}</span>
                              </span>
                            </th>
                            <td>{row.playedGames ?? "—"}</td>
                            <td>{row.won ?? "—"}</td>
                            <td>{row.draw ?? "—"}</td>
                            <td>{row.lost ?? "—"}</td>
                            <td className="points">{row.points ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
