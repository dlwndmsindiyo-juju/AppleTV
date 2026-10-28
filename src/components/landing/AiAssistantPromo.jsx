import React, { useState } from "react";
import { Link } from "react-router-dom";

// AI 어시스턴트 안내 띠 (로그인 전 메인 · 시안)
// - 왼쪽: APPLE TV / 제목 / 설명,  오른쪽: 흰 카드(취향 칩 + 맞는 작품 찾기)
// - 로그인 전이라 버튼은 로그인 페이지로 이동 (선택한 취향은 state 로 함께 전달)
const TASTES = ["편안한 힐링", "몰입감 있는", "가볍게 웃는"];

const AiAssistantPromo = ({ ctaPath = "/login" }) => {
  const [taste, setTaste] = useState(null);

  return (
    <section className="ai-promo">
      <div className="ai-promo-band">
        <div className="inner">
          <div className="ai-promo-text">
            <p className="ai-promo-eyebrow">APPLE TV</p>
            <h3 className="ai-promo-title">오늘의 취향을 발견하세요.</h3>
            <p className="ai-promo-desc">
              기분과 취향에 맞는 작품을 AI가 추천해 드려요.
              <br />
              지금 나에게 맞는 이야기를 찾아보세요.
            </p>
          </div>

          <div className="ai-promo-card">
            <h4 className="ai-promo-card-title">AI Assistant</h4>
            <p className="ai-promo-card-sub">단 3일간의 무료체험</p>

            <ul className="ai-promo-chips" aria-label="취향 선택">
              {TASTES.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className={`ai-promo-chip${taste === t ? " active" : ""}`}
                    aria-pressed={taste === t}
                    onClick={() => setTaste(taste === t ? null : t)}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>

            <p className="ai-promo-question">무엇을 보고 싶으세요?</p>
            <Link to={ctaPath} state={{ taste }} className="ai-promo-btn">
              맞는 작품 찾기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantPromo;
