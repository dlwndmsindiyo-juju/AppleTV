import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AiAssistantPopup from "./AiAssistantPopup";
import { useAuthStore, getSettings } from "../../store/useAuthStore"; // [추가] 계정 설정 "Apple Assistant 사용"

// Router 안의 어느 화면에서든 import하여 사용합니다. Provider/라우트 추가 불필요.
export default function AiAssistantLink({ children, initialTaste = null, className = "", onRecommend, asButton = false }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);
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
      {open && <AiAssistantPopup initialTaste={initialTaste} onClose={close} onRecommend={onRecommend} requireSubscription />} {/* [추가] 구독 전: 취향 버튼 → 구독 안내 팝업 */}
    </>
  );
}
