import { useState } from "react";
import AiAssistantLink from "./AiAssistantLink";
import AiLogo from "./AiLogo"; // [수정] AI 아이콘 공용 (빛나며 움직임)
import { useAuthStore } from "../../store/useAuthStore"; // [추가] 로그인 여부
import { openSubscribeGate } from "../../utils/subscribeGate"; // [추가] 로그인 전: 구독 안내 팝업
import bannerBg from "./assets/ai-promo-bg.jpg"; // [수정] 배경 이미지는 import 로 (Vite 가 빌드 경로를 붙여 줌 · 팝업 아이콘과 같은 방식)

// [수정] AI 어시스트 홍보 배너 (로그인 전 메인 · 시안: AI 어시스트_홍보배너 1920 × 210)
// - 배경: components/ai/assets/ai-promo-bg.jpg → import 해서 .ai-banner-band 에 style 로 넣음 (크기 · 위치는 App.scss)
// - 왼쪽: [✦ 아이콘] APPLE TV · AI ASSISTANT / 제목 / 설명
// - 오른쪽 상자(590 × 118 · 모서리 15): 질문 + 기분 칩 4개 + [취향 더 반영하기 →]
// - 고른 기분을 공통 AI 팝업에 넘겨서 엽니다.
// - 스타일: App.scss (.ai-banner-*) · 색 토큰: _variables.scss ($ai-banner-*)
const MOODS = ["힘든", "슬픈", "즐거운", "화난"];

const AiAssistantPromo = () => {
  const [mood, setMood] = useState(null);
  const user = useAuthStore((s) => s.user); // [추가]

  return (
    <section className="ai-banner">
      <div className="ai-banner-band" style={{ backgroundImage: `url(${bannerBg})` }}>
        <div className="inner">
          <div className="ai-banner-content">
            <div className="ai-banner-text">
              <p className="ai-banner-eyebrow">
                <AiLogo size={24} />
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

                {/* [수정] 로그인 전: AI 팝업 대신 바로 구독 안내 팝업 (모양은 같은 버튼) */}
                {user ? (
                  <AiAssistantLink initialTaste={mood} className="ai-banner-btn">
                    취향 더 반영하기
                    <img className="ai-banner-btn-icon" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
                  </AiAssistantLink>
                ) : (
                  <button type="button" className="ai-banner-btn" onClick={() => openSubscribeGate("watch")}>
                    취향 더 반영하기
                    <img className="ai-banner-btn-icon" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantPromo;
