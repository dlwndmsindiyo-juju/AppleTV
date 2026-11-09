// src/components/common/DetailBackLink.jsx
// [추가] 상세 페이지 "← 홈으로" · "← 스포츠 홈으로" 공용 — 모든 상세에서 같은 자리 · 같은 모양
// - 자리: 헤더 아래 24px (휴대폰 16px) · 이너 왼쪽 끝 (영화 상세 플레이어 박스 바로 위와 같은 자리)
// - overlay: 위에 히어로가 있는 스포츠 상세 → 히어로 위에 겹쳐서 같은 자리에 (페이지 배치는 그대로)
// - 스타일: App.scss (.detail-back · .detail-back-bar)
// - [수정] 사이트 안에서 들어왔으면 "뒤로"(브라우저 뒤로와 같음) → 보던 페이지의 스크롤 · 고르던 콘텐츠 · AI 추천 결과 그대로
//   (ReturnPosition.jsx · AiAssistantLink.jsx) / 주소로 바로 들어왔으면 to(기본 홈)로
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const DetailBackLink = ({ to = "/", label = "홈으로", overlay = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const canGoBack = location.key !== "default"; // 처음 연 페이지면 "default"
  const link = (
    <Link
      className="detail-back"
      to={to}
      onClick={(e) => {
        if (!canGoBack || e.metaKey || e.ctrlKey || e.shiftKey) return; // 새 탭 열기 등은 그대로
        e.preventDefault();
        navigate(-1);
      }}
    >
      ← {label}
    </Link>
  );
  if (!overlay) return link;
  return <div className="inner detail-back-bar">{link}</div>;
};

export default DetailBackLink;
