import { useState } from "react";
import AiAssistantLink from "./AiAssistantLink";

// [수정] AI 어시스트 홍보 배너 (로그인 전 메인 · 시안: AI 어시스트_홍보배너 1920 × 210)
// - 배경: components/ai/assets/ai-promo-bg.jpg (화면 전체 폭 · App.scss .ai-banner-band)
// - 왼쪽: [✦ 아이콘] APPLE TV · AI ASSISTANT / 제목 / 설명
// - 오른쪽 상자(590 × 118 · 모서리 15): 질문 + 기분 칩 4개 + [취향 더 반영하기 →]
// - 고른 기분을 공통 AI 팝업에 넘겨서 엽니다.
// - 스타일: App.scss (.ai-banner-*) · 색 토큰: _variables.scss ($ai-banner-*)
const MOODS = ["힘든", "슬픈", "즐거운", "화난"];

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 6.5l1.4 4.1 4.1 1.4-4.1 1.4L12 17.5l-1.4-4.1L6.5 12l4.1-1.4z" fill="currentColor" />
  </svg>
);

const AiAssistantPromo = () => {
  const [mood, setMood] = useState(null);

  return (
    <section className="ai-banner">
      <div className="ai-banner-band">
        <div className="inner">
          <div className="ai-banner-content">
            <div className="ai-banner-text">
              <p className="ai-banner-eyebrow">
                <span className="ai-banner-icon">
                  <SparkIcon />
                </span>
                APPLE TV · AI ASSISTANT
              </p>
              <h3 className="ai-banner-title">오늘의 취향을 발견하세요.</h3>
              <p className="ai-banner-desc">기분과 취향에 맞는 작품을 AI가 추천해 드려요.</p>
            </div>

            <div className="ai-banner-box">
              <div className="ai-banner-box-head">
                <p className="ai-banner-question">지금 어떤 작품이 끌리나요?</p>
                <span className="ai-banner-tag">AI 취향 분석</span>
              </div>

              <div className="ai-banner-row">
                <ul className="ai-banner-chips" aria-label="기분 선택">
                  {MOODS.map((m) => (
                    <li key={m}>
                      <button
                        type="button"
                        className={`ai-banner-chip${mood === m ? " is-active" : ""}`}
                        aria-pressed={mood === m}
                        onClick={() => setMood(mood === m ? null : m)}
                      >
                        {m}
                      </button>
                    </li>
                  ))}
                </ul>

                <AiAssistantLink initialTaste={mood} className="ai-banner-btn">
                  취향 더 반영하기
                  <img className="ai-banner-btn-icon" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
                </AiAssistantLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantPromo;
