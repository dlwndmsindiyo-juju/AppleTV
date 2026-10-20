import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { SPORT_TEAMS } from "../../data/sportTeams";
import { useTeamStore } from "../../store/useTeamStore";
import SportTeamCard from "./SportTeamCard";

// 구단 전체 페이지 경로 (라우터에 등록한 경로와 맞춰 주세요)
export const SPORT_TEAMS_PATH = "/sport/teams";

// 스포츠 홈 > 관심있는 구단 (슬라이드 + 구독)
const SportTeams = ({ title = "관심있는 구단" }) => {
  const favorites = useTeamStore((s) => s.favorites);
  const [filter, setFilter] = useState("all"); // all | east | west | mine

  // 필터 탭 (개수 표시용)
  const filters = useMemo(
    () => [
      { key: "all", label: "전체", count: SPORT_TEAMS.length },
      { key: "east", label: "동부", count: SPORT_TEAMS.filter((t) => t.conference === "east").length },
      { key: "west", label: "서부", count: SPORT_TEAMS.filter((t) => t.conference === "west").length },
      { key: "mine", label: "내 구단", count: favorites.length },
    ],
    [favorites.length]
  );

  // 선택한 탭에 맞는 팀 목록
  const filtered = useMemo(() => {
    if (filter === "mine") return SPORT_TEAMS.filter((t) => favorites.includes(t.id));
    if (filter === "all") return SPORT_TEAMS;
    return SPORT_TEAMS.filter((t) => t.conference === filter);
  }, [filter, favorites]);

  return (
    <section className="sport-teams">
      <div className="inner">
        {/* 제목 + 구독 수 */}
        <div className="sport-teams-head">
          <div>
            <h3 className="sport-teams-title">{title}</h3>
            <p className="sport-teams-desc">
              좋아하는 팀을 등록하면 경기 알림과 일정을 빠르게 확인할 수 있어요.
            </p>
          </div>
          <p className="sport-teams-count">
            구독 중 <strong>{favorites.length}</strong>팀
          </p>
        </div>

        {/* 필터 탭 */}
        <ul className="sport-team-filter" role="tablist">
          {filters.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={filter === f.key ? "active" : ""}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="count">{f.count}</span>
              </button>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="sport-team-empty">
            아직 구독한 구단이 없어요. + 버튼으로 관심 구단을 추가해 보세요.
          </p>
        ) : (
          // 가로 슬라이드 (이너 폭에서 잘림 / 탭이 바뀌면 처음 위치로)
          <Swiper
            key={filter}
            className="sport-team-swiper"
            modules={[FreeMode]}
            slidesPerView="auto"
            spaceBetween={36}
            freeMode
            grabCursor
          >
            {filtered.map((team) => (
              <SwiperSlide key={team.id} className="sport-team-slide">
                <SportTeamCard team={team} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        {/* 구단 전체 페이지로 이동 */}
        <Link to={SPORT_TEAMS_PATH} className="sport-team-more">
          전체 구단 보기 ({SPORT_TEAMS.length})
        </Link>
      </div>
    </section>
  );
};

export default SportTeams;
