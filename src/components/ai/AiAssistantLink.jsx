import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import AiAssistantPopup from "./AiAssistantPopup";
import { useAuthStore, getSettings, isSubscribed } from "../../store/useAuthStore"; // [추가] 계정 설정 "Apple Assistant 사용"
import { peekResumeIntent, clearResumeIntent } from "../../utils/resumeIntent"; // [추가] 로그인 · 구독 후 하던 AI 추천으로 돌아오기
import { peekAiReturn, clearAiReturn } from "../../utils/aiReturn"; // [추가] 상세에서 뒤로 오면 보던 추천 결과로

// Router 안의 어느 화면에서든 import하여 사용합니다. Provider/라우트 추가 불필요.
export default function AiAssistantLink({ children, initialTaste = null, className = "", onRecommend, asButton = false }) {
  const [open, setOpen] = useState(false);
  const [resumePick, setResumePick] = useState(null);
  const [restoreState, setRestoreState] = useState(null); // [추가] 보던 추천 결과
  const location = useLocation();
  const navType = useNavigationType();
  const close = useCallback(() => {
    setOpen(false);
    setResumePick(null);
    setRestoreState(null);
  }, []);

  // [추가] AI 추천 결과 → 작품 상세 → 뒤로(브라우저 뒤로 · "← 홈으로"): 보던 추천 결과 그대로 팝업 다시 열기
  // - 뒤로 온 경우(POP)만 · 같은 페이지일 때만 · 한 번 쓰면 지움 (화면에 AI 버튼이 여러 개여도 하나만 엶)
  useEffect(() => {
    const saved = peekAiReturn();
    if (!saved) return;
    if (navType !== "POP" || saved.path !== `${location.pathname}${location.search}`) {
      if (navType === "PUSH" && !location.pathname.match(/^\/(movie|tv)\//)) clearAiReturn(); // 다른 곳으로 새로 이동하면 기록 지움
      return;
    }
    clearAiReturn();
    setRestoreState(saved.snapshot);
    setOpen(true);
  }, [navType, location.pathname, location.search]);

  // [추가] 로그인 · 구독을 마치고 이 화면으로 돌아왔을 때: AI 추천 팝업을 다시 열고 고르려던 칩을 골라 둠
  // - 화면에 AI 버튼이 여러 개여도 처음 확인한 하나만 엶 (기록을 바로 지움)
  const subscribed = useAuthStore((s) => isSubscribed(s.user));
  useEffect(() => {
    if (!subscribed) return;
    const intent = peekResumeIntent();
    if (!intent?.ai || intent.path !== `${location.pathname}${location.search}`) return;
    clearResumeIntent();
    setResumePick(intent.ai);
    setOpen(true);
  }, [subscribed, location.pathname, location.search]);
  // [추가] 로그인한 사용자가 계정 설정에서 Apple Assistant 를 끄면 AI 버튼 · 팝업을 숨김 (로그인 전에는 그대로)
  const assistantOff = useAuthStore((s) => Boolean(s.user) && !getSettings(s.user).assistant);
  if (assistantOff) return null;

  const Trigger = asButton ? "button" : Link;
  const triggerProps = asButton ? { type: "button" } : { to: `${location.pathname}${location.search}${location.hash}` };

  return (
    <>
      <Trigger
        {...triggerProps}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Trigger>
      {open && <AiAssistantPopup initialTaste={initialTaste} onClose={close} onRecommend={onRecommend} requireSubscription resumePick={resumePick} restoreState={restoreState} />} {/* [추가] 구독 전: 취향 버튼 → 구독 안내 팝업 */}
    </>
  );
}
