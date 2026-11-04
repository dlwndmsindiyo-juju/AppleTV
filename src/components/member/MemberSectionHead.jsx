import React from "react";
import { Link } from "react-router-dom";

// 로그인 후 홈 섹션 머리 (제목 · 소제목 · 오른쪽 "더보기")
// - [정리] 이어보기 · 찜 · 추천작 · AI 어시스트 · 신규출시 · 공개예정작에 똑같이 있던 마크업을 하나로
// - moreTo 가 있을 때만 오른쪽 링크 표시
const MemberSectionHead = ({ title, desc, moreTo, moreLabel = "더보기" }) => (
  <div className="member-head">
    <div>
      <h2 className="member-title">{title}</h2>
      <p className="member-desc">{desc}</p>
    </div>
    {moreTo && (
      <Link to={moreTo} className="member-more">
        {moreLabel}
      </Link>
    )}
  </div>
);

export default MemberSectionHead;
