// src/components/common/DetailBackLink.jsx
// [추가] 상세 페이지 "← 홈으로" · "← 스포츠 홈으로" 공용 — 모든 상세에서 같은 자리 · 같은 모양
// - 자리: 헤더 아래 24px (휴대폰 16px) · 이너 왼쪽 끝 (영화 상세 플레이어 박스 바로 위와 같은 자리)
// - overlay: 위에 히어로가 있는 스포츠 상세 → 히어로 위에 겹쳐서 같은 자리에 (페이지 배치는 그대로)
// - 스타일: App.scss (.detail-back · .detail-back-bar)
import React from "react";
import { Link } from "react-router-dom";

const DetailBackLink = ({ to = "/", label = "홈으로", overlay = false }) => {
  const link = <Link className="detail-back" to={to}>← {label}</Link>;
  if (!overlay) return link;
  return <div className="inner detail-back-bar">{link}</div>;
};

export default DetailBackLink;
