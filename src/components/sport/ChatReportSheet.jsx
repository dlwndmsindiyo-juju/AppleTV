// src/components/sport/ChatReportSheet.jsx
// [추가] 라이브 채팅 신고 팝업 (UI만 · 서버로 보내지 않음)
// - 디자인: 공유 팝업과 같은 틀 (어두운 팝업 · 제목 + 닫기 · ShareSheet.scss 의 share-dim / share-modal / share-head / share-close)
// - 사유 라디오를 하나 고르면 [신고] 버튼 활성 → 누르면 팝업 닫고 "신고가 접수되었습니다." 토스트
// - 닫기: × · 바깥 어두운 곳 · Esc / 열려 있는 동안 뒤 화면 스크롤 막음
// - 스타일: components/sport/ChatReportSheet.scss
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../utils/toast";
import "../common/ShareSheet.scss";
import "./ChatReportSheet.scss";

const REASONS = [
  "성적인 콘텐츠",
  "폭력적 또는 혐오스러운 콘텐츠",
  "증오 또는 악의적인 콘텐츠",
  "괴롭힘 또는 폭력",
  "유해하거나 위험한 행위",
  "자살, 자해 또는 섭식 장애",
  "잘못된 정보",
  "스팸 또는 혼동을 야기하는 콘텐츠",
  "기타",
];

const ChatReportSheet = ({ open, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");
  const closeRef = useRef(null);

  // 열 때마다 처음 상태로
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit?.(reason);
    showToast("신고가 접수되었습니다.");
  };

  return createPortal(
    <div className="share-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="share-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="share-head">
          <h2 id="report-title">신고</h2>
          <button type="button" className="share-close" onClick={onClose} aria-label="닫기" ref={closeRef}>
            <span className="share-close-icon" aria-hidden="true" />
          </button>
        </div>

        <form className="report-form" onSubmit={submit}>
          <div className="report-scroll">
            <h3 className="report-question">어떤 문제인가요?</h3>
            <p className="report-desc">모든 커뮤니티 가이드에 대해 확인하므로 완벽히 들어맞지 않아도 괜찮습니다.</p>

            <ul className="report-options" role="radiogroup" aria-labelledby="report-title">
              {REASONS.map((label) => (
                <li key={label}>
                  <label className={`report-option${reason === label ? " is-checked" : ""}`}>
                    <input
                      type="radio"
                      name="chat-report-reason"
                      value={label}
                      checked={reason === label}
                      onChange={() => setReason(label)}
                    />
                    <span className="report-radio" aria-hidden="true" />
                    <span className="report-label">{label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" className="report-submit" disabled={!reason}>
            신고
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
};

export default ChatReportSheet;
