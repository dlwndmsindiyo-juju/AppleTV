import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { CONFERENCES } from "../../data/sportTeams";
import { conferenceRows, clubOf } from "./standingsUtils";

// MLS 로고 (public/images/sport-team/mls-logo.svg 를 넣으면 이미지로, 없으면 텍스트 배지로 표시)
const MLS_LOGO = `${import.meta.env.BASE_URL}images/sport-team/mls-logo.svg`;

const COLUMNS = ["경기", "승", "무", "패", "승점"];

// 컨퍼런스 로고 (이미지가 없으면 텍스트 배지)
export const LeagueLogo = () => {
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

  // 컨퍼런스별 상위 5팀 (승점 → 원래 순위 순, 전체 순위는 /sport/standings)
  const rowsOf = (key) => conferenceRows(standings, key, 5);

  return (
    <section className="sport-league sport-conferences" aria-labelledby="sport-standings-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-standings-title">리그 순위</h3>
          <Link className="sport-more" to="/sport/standings">
            전체 보기 <span aria-hidden="true">→</span>
          </Link>
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
                      ) : rows.map((item, index) => {
                        const { row } = item;
                        const { key: clubKey, logo, name } = clubOf(item);
                        return (
                          <tr key={clubKey}>
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
