import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
// 로그인 후 메인(ComingSoon)과 같은 장르 변환 함수 사용 — 경로는 프로젝트 구조에 맞게 확인해 주세요
import { genreText, MOVIE_GENRES } from "../member/memberUtils";

// 날짜 문자열(2026-11-05) → "2026. 11. 5 개봉"
const formatRelease = (dateStr) => {
  if (!dateStr) return "개봉 예정";
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} 개봉`;
};

// 공개예정작 (시안: 포스터 + 장르 · 제목 · 줄거리 · 알림 버튼, 카드 2개)
const UpcomingSection = ({
  title = "공개예정작",
  desc = "시선을 사로잡을 다음 이야기",
}) => {
  const { upcoming, onFetchUpcoming, alarms, onToggleAlarm } = useMovieStore();

  useEffect(() => {
    onFetchUpcoming();
  }, [onFetchUpcoming]);

  if (!upcoming || upcoming.length === 0) return null;

  // 오늘 이후 개봉작을 가까운 날짜순으로 정렬 후 포스터가 있는 2개
  const today = new Date().toISOString().slice(0, 10);
  const items = upcoming
    .filter((m) => m.poster_path && m.release_date && m.release_date >= today)
    .sort((a, b) => a.release_date.localeCompare(b.release_date))
    .slice(0, 2);

  if (items.length === 0) return null;

  return (
    <section className="upcoming-section">
      <div className="inner">
        <h3 className="upcoming-title">{title}</h3>
        <p className="upcoming-desc">{desc}</p>

        <ul className="upcoming-list">
          {items.map((movie) => {
            const alarmKey = `movie_${movie.id}`;
            const on = (alarms || []).includes(alarmKey);
            const genres = genreText(movie.genre_ids, MOVIE_GENRES);

            return (
              <li className="upcoming-card" key={movie.id}>
                <Link to={`/detail/${movie.id}`} className="upcoming-thumb">
                  <img
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    loading="lazy"
                  />
                </Link>

                <div className="upcoming-info">
                  <span className="upcoming-meta">
                    {genres ? `${genres} · ` : ""}
                    {formatRelease(movie.release_date)}
                  </span>
                  <h4 className="upcoming-movie-title">
                    <Link to={`/detail/${movie.id}`}>{movie.title}</Link>
                  </h4>
                  <p className="upcoming-overview">
                    {movie.overview || "줄거리 정보가 아직 없습니다."}
                  </p>
                  <button
                    type="button"
                    className={`upcoming-btn${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => onToggleAlarm && onToggleAlarm(alarmKey)}
                  >
                    {on ? (
                      <>
                        <span className="bell-icon" aria-hidden="true" />
                        알림 설정됨
                      </>
                    ) : (
                      "알림 받기"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default UpcomingSection;
