import React from "react";
import { Link } from "react-router-dom";

// 마지막 배너: 경기 알림 설정 유도
const SportNotify = () => {
  return (
    <section className="sport-notify">
      <div className="inner">
        <div className="sport-notify-banner">
          <div className="sport-notify-text">
            <h3 className="sport-notify-title">
              다음 경기, 알림으로 만나보세요.
            </h3>
            <p className="sport-notify-desc">
              선택한 팀과 리그의 경기 시작 알림을 설정할 수 있어요.
            </p>
          </div>

          <Link to="/login" className="sport-notify-btn">
            알림 설정
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SportNotify;
