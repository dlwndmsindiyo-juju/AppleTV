import React, { useState } from "react";

// [추가] 팀 뱃지 (배경 없이 뱃지만) — 스포츠 화면 공용
// - src: 뱃지 주소 (public/images/matches/*.svg · API 엠블럼)
// - 파일이 아직 없으면(불러오기 실패) fallback 으로 한 번 바꿔 보고, 그것도 없으면 이름 첫 글자
// - 관심있는 구단 카드(SportTeamCard) · 실시간 채팅 프로필은 이 컴포넌트를 쓰지 않음
const TeamBadge = ({ src, fallback, label = "", className = "", ...rest }) => {
  const [step, setStep] = useState(0); // 0: src · 1: fallback · 2: 글자
  const url = step === 0 ? src || fallback : step === 1 ? fallback : null;

  if (!url) {
    return (
      <span className={`${className} sport-badge-initial`.trim()} aria-hidden="true">
        {label?.[0] || ""}
      </span>
    );
  }
  return (
    <img
      className={className || undefined}
      src={url}
      alt=""
      onError={() => setStep((s) => (s === 0 && src && fallback && fallback !== src ? 1 : 2))}
      {...rest}
    />
  );
};

export default TeamBadge;
