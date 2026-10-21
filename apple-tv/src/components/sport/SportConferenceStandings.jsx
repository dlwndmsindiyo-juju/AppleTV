import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS, CONFERENCES } from "../../data/sportTeams";

// 제공된 실제 순위만 사용하며, PDF의 예시 승점을 실시간 데이터로 표시하지 않습니다.
const teamInfo = (team) => SPORT_TEAMS.find((item) =>
  [item.enName, item.name, item.shortName].some((name) =>
    [team?.name, team?.shortName].includes(name)
  )
);

export default function SportConferenceStandings() {
  const standings = useSportStore((state) => state.standings);
  const groups = useSportStore((state) => state.standingsGroups);

  return (
    <section className="sport-league sport-conferences" aria-labelledby="sport-standings-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-standings-title">리그 순위</h3>
          <a className="sport-more" href="https://www.mlssoccer.com/standings/" target="_blank" rel="noreferrer">전체 보기 →</a>
        </div>
        <div className="sport-conference-grid">
          {Object.entries(CONFERENCES).map(([key, label]) => {
            const group = (groups || []).find((item) =>
              item.type === "TOTAL" && (key === "east" ? /east/i : /west/i).test(item.group || "")
            );
            const rows = (group?.table || standings.filter((row) => teamInfo(row.team)?.conference === key))
              .slice().sort((a, b) => a.position - b.position).slice(0, 5);
            return (
              <div className="sport-conference-card" key={key}>
                <h4><span className="sport-conference-badge" aria-hidden="true">MLS</span>{label}</h4>
                <div className="sport-conference-scroll">
                  <table>
                    <caption className="sport-sr-only">{label} 상위 5개 구단 순위</caption>
                    <thead><tr><th scope="col"><span className="sport-sr-only">순위</span></th><th scope="col">클럽</th><th scope="col">경기</th><th scope="col">승</th><th scope="col">무</th><th scope="col">패</th><th scope="col">승점</th></tr></thead>
                    <tbody>
                      {rows.length === 0 ? <tr><td colSpan={7} className="sport-conference-empty">순위 정보를 불러올 수 없습니다.</td></tr> : rows.map((row) => {
                        const info = teamInfo(row.team);
                        const logo = row.team?.crest || info?.logo;
                        return (
                          <tr key={row.team?.id || row.team?.name}>
                            <td>{row.position}</td>
                            <th scope="row"><span className="sport-conference-club">{logo && <img src={logo} alt="" loading="lazy" />}<span>{info?.shortName || row.team?.shortName || row.team?.name}</span></span></th>
                            <td>{row.playedGames ?? "—"}</td><td>{row.won ?? "—"}</td><td>{row.draw ?? "—"}</td><td>{row.lost ?? "—"}</td><td><strong>{row.points ?? "—"}</strong></td>
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
