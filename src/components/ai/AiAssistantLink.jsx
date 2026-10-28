import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AiAssistantPopup from "./AiAssistantPopup";

// Router 안의 어느 화면에서든 import하여 사용합니다. Provider/라우트 추가 불필요.
export default function AiAssistantLink({ children, initialTaste = null, className = "", onRecommend }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Link
        to={`${location.pathname}${location.search}${location.hash}`}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {open && <AiAssistantPopup initialTaste={initialTaste} onClose={close} onRecommend={onRecommend} />}
    </>
  );
}
