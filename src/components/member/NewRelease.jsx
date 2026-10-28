import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, detailPath } from "./memberUtils";

const NewRelease = () => {
  const appleOriginals = useMovieStore((s) => s.appleOriginals);
  const alarms = useMovieStore((s) => s.alarms);
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);

  // 이어보기/찜과 겹치지 않도록 뒤쪽 작품 사용
  const items = appleOriginals.slice(4, 6);
  if (items.length === 0) return null;

  return (
    <section className="member-section member-newrelease">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">신규출시</h2>
            <p className="member-desc">새 시즌 소식을 가장 먼저 받아보세요</p>
          </div>
          <Link to="/schedule" className="member-more">
            전체 공개 일정 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </Link>
        </div>

        <ul className="member-pair">
          {items.map((tv) => {
            const on = alarms.includes(`tv_${tv.id}`);
            return (
              <li key={tv.id} className="member-wide-card">
                <Link to={detailPath("tv", tv.id)} className="member-wide-thumb">
                  <img src={img(tv.backdrop_path || tv.poster_path, "w500")} alt="" loading="lazy" />
                </Link>
                <div className="member-wide-info">
                  <span className="member-card-meta">새 시즌 · 공개일 미정</span>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">공개 일정은 공식 발표에서 확인하세요.</span>
                  <button
                    type="button"
                    className={`member-btn${on ? " filled" : ""}`}
                    aria-pressed={on}
                    onClick={() => onToggleAlarm(`tv_${tv.id}`)}
                  >
                    {on ? (
                      <>
                        <span className="bell-icon" aria-hidden="true" />
                        알림 설정됨
                      </>
                    ) : (
                      "공개 알림 설정"
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

export default NewRelease;
