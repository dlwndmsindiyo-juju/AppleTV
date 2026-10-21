import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS, CONFERENCES } from "../../data/sportTeams";

// 제공된 실제 순위만 사용하며, PDF의 예시 승점을 실시간 데이터로 표시하지 않습니다.
// 팀 이름 비교용 정규화: 악센트/FC·CF·SC/기호 제거 (예: "Atlanta United FC" = "Atlanta United")
const norm = (v = "") => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\b(fc|cf|sc)\b/g, "").replace(/[^a-z0-9가-힣]/g, "");

const teamInfo = (team) => {
  const targets = [team?.name, team?.shortName].map(norm).filter(Boolean);
  const exact = SPORT_TEAMS.find((item) =>
    [item.enName, item.name, item.shortName].map(norm).some((n) => n && targets.includes(n))
  );
  if (exact) return exact;
  // 정확히 맞는 게 없으면 한쪽이 다른 쪽을 포함하는 경우까지 허용 (짧은 이름의 오매칭 방지로 6자 이상만)
  return SPORT_TEAMS.find((item) => {
    const n = norm(item.enName);
    return n.length >= 6 && targets.some((t) => t.includes(n) || n.includes(t));
  });
};

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
                      {rows.length === 0 ? <tr><td colSpan={7} className="sport-conference-empty">순위 정보를 불러올 수 없습니다.</td></tr> : rows.map((row, index) => {
                        const info = teamInfo(row.team);
                        const logo = info?.logo || row.team?.crest;
                        return (
                          <tr key={row.team?.id || row.team?.name}>
                            <td>{index + 1}</td>
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
