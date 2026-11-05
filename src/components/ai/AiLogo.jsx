// src/components/ai/AiLogo.jsx
// [추가] AI 아이콘 공용 (원본: components/ai/assets/ai-logo.svg · 보라 그라데이션 둥근 네모 + 흰 별)
// - 컬러가 계속 빛나며 움직이는 효과: 안쪽 그라데이션 색이 돌아가며 흐르고 (SVG animate)
//   바깥 보라 빛이 숨 쉬듯 커졌다 작아짐 (AiLogo.scss)
// - 쓰는 곳: 로그인 전 홈 AI 홍보 배너 · AI 팝업 안내 문구 · TV 사이드 메뉴 "AI"
// - 기기의 "동작 줄이기" 설정이면 멈춘 아이콘
import React, { useId } from "react";
import "./AiLogo.scss";

// 원본 svg 그라데이션 색 (0% · 58% · 100%)
const C1 = "#6282FF";
const C2 = "#7C45EF";
const C3 = "#A448E8";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const AiLogo = ({ size = 24, className = "" }) => {
  const uid = useId().replace(/:/g, "");
  const gradId = `ai-logo-grad-${uid}`;
  const still = reduceMotion();

  return (
    <span className={`ai-logo${className ? ` ${className}` : ""}`} style={{ "--ai-logo-size": `${size}px` }} aria-hidden="true">
      {/* 원본 60 × 60 중 아이콘(24 × 24) 부분만 · 그림자는 CSS 로 */}
      <svg viewBox="18 12 24 24" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="21.5975" y1="12" x2="38.4025" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor={C1}>
              {!still && <animate attributeName="stop-color" values={`${C1};${C3};${C2};${C1}`} dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="0.58" stopColor={C2}>
              {!still && <animate attributeName="stop-color" values={`${C2};${C1};${C3};${C2}`} dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="1" stopColor={C3}>
              {!still && <animate attributeName="stop-color" values={`${C3};${C2};${C1};${C3}`} dur="4s" repeatCount="indefinite" />}
            </stop>
            {!still && (
              <animateTransform attributeName="gradientTransform" type="rotate" values="0 30 24;360 30 24" dur="6s" repeatCount="indefinite" />
            )}
          </linearGradient>
        </defs>

        {/* 둥근 네모 (그라데이션) + 안쪽 흰 테두리 20% */}
        <rect x="18" y="12" width="24" height="24" rx="7" fill={`url(#${gradId})`} />
        <rect x="18.333" y="12.333" width="23.333" height="23.333" rx="6.667" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.667" />

        {/* 흰 별 */}
        <path d="M30 18.75C30.225 21.675 32.325 23.775 35.25 24C32.325 24.225 30.225 26.325 30 29.25C29.775 26.325 27.675 24.225 24.75 24C27.675 23.775 29.775 21.675 30 18.75Z" fill="#fff" />
      </svg>
    </span>
  );
};

export default AiLogo;
