// src/components/profile/AccountShared.jsx
// [추가] 계정 설정 하위 화면 공용 (구독 관리 · 지불 방법)
// - 화면 틀: "계정 설정" 제목 + "‹ 뒤로" (계정 설정의 그 섹션으로) · 스타일 App.scss (.account-*)
// - 구독 상태 · 요금제 · 날짜 글자 (Profile.jsx · AccountSubscription.jsx 공용)
import React, { useEffect, useLayoutEffect, useRef, useState } from "react"; // [수정] useLayoutEffect · useState: 누른 자리에 팝업
import { createPortal } from "react-dom"; // [추가] 확인 팝업을 body 에 바로 그림
import { Link } from "react-router-dom";
import { isSubscribed } from "../../store/useAuthStore";

// 요금제 (pages/Subscribe.jsx 의 금액과 같음)
export const PLAN_INFO = {
  monthly: { name: "Apple TV 월간 플랜", price: "월 ₩6,500", renewLabel: "₩6,500/개월" },
  yearly: { name: "Apple TV 연간 플랜", price: "연 ₩65,000", renewLabel: "₩65,000/년" },
};

// 카드사 (지불 방법 추가 · 데모용 목록)
// [수정] 카드사 로고 (public/icons/card-brand/*.svg) — 목록 순서 = 지불 방법 추가의 카드사 선택 순서
const CARD_BRAND_DIR = "/icons/card-brand";
export const CARD_BRAND_ICONS = {
  "신한카드": `${CARD_BRAND_DIR}/shinhan.svg`,
  "KB국민카드": `${CARD_BRAND_DIR}/kb.svg`,
  "현대카드": `${CARD_BRAND_DIR}/hyundai.svg`,
  "삼성카드": `${CARD_BRAND_DIR}/samsung.svg`,
  "우리카드": `${CARD_BRAND_DIR}/woori.svg`,
  "하나카드": `${CARD_BRAND_DIR}/hana.svg`,
  "롯데카드": `${CARD_BRAND_DIR}/lotte.svg`,
  "BC카드": `${CARD_BRAND_DIR}/bc.svg`,
  "NH농협카드": `${CARD_BRAND_DIR}/nh.svg`,
  "IBK기업은행": `${CARD_BRAND_DIR}/ibk.svg`,
  "BNK부산은행": `${CARD_BRAND_DIR}/bnk.svg`,
  "우체국": `${CARD_BRAND_DIR}/epost.svg`,
  "카카오뱅크": `${CARD_BRAND_DIR}/kakaobank.svg`,
  "케이뱅크": `${CARD_BRAND_DIR}/kbank.svg`,
  "토스뱅크": `${CARD_BRAND_DIR}/tossbank.svg`,
};
export const CARD_BRANDS = Object.keys(CARD_BRAND_ICONS);

const toMillis = (t) => (t?.toMillis ? t.toMillis() : t ? Number(t) : 0);

// "11월 12일"
export const formatMonthDay = (t) => {
  const ms = toMillis(t);
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 구독 상태: "none"(구독 없음 · 만료) | "active"(자동 갱신) | "canceled"(취소 · 만료일까지 이용)
export const getSubscriptionState = (user) => {
  const sub = user?.subscription;
  if (!isSubscribed(user)) return { state: "none" };
  const plan = PLAN_INFO[sub.plan] ? sub.plan : "monthly";
  return {
    state: user.subscriptionCanceled ? "canceled" : "active",
    plan,
    info: PLAN_INFO[plan],
    trial: sub.status === "trial",
    endDate: formatMonthDay(sub.expiresAt),
  };
};

// 계정 설정 메인에 보여줄 한 줄 ("Apple TV 월간 플랜 · 11월 12일에 갱신 예정")
export const subscriptionSummary = (user) => {
  const s = getSubscriptionState(user);
  if (s.state === "none") return "구독 중인 항목이 없습니다.";
  if (s.state === "canceled") return `${s.info.name} · ${s.endDate}에 만료 예정`;
  return `${s.info.name}${s.trial ? " (무료 체험 중)" : ""} · ${s.endDate}에 갱신 예정`;
};

// 화면 틀: 뒤로 + 제목 (back: 돌아갈 계정 설정 섹션 id)
export const AccountSubPage = ({ back, children }) => (
  <main className="account-page account-page--sub">
    <div className="account-inner">
      {/* [수정] 뒤로 가기를 제목 위로 (제목 아래 구분선은 계정 설정과 같음) */}
      <div className="account-back-row">
        <Link className="account-back" to={`/profile#${back}`}>
          <svg className="account-back-icon" width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
            <path d="M6.5 1 1.5 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          뒤로
        </Link>
      </div>
      <h1 className="account-title account-title--sub">계정 설정</h1>
      {children}
    </div>
  </main>
);

// 작은 아이콘 (카드 · 달력 · 추가 · 순서) — 글자색을 따라감
export const AccountIcon = ({ name }) => {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true, className: "account-icon" };
  if (name === "card") {
    return (
      <svg {...common}>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 9.5h19M6 15h4" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v3M16 3v3" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  if (name === "order") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9.5 12 7l3 2.5M9 14.5 12 17l3-2.5" />
      </svg>
    );
  }
  return null;
};

// 확인 팝업 (모든 브라우저에서 로그아웃 · 재생 기록 지우기 · 구독 취소 · 지불 방법 추가)
// [이동] Profile.jsx → 공용 · children: 팝업 안 입력 칸 (지불 방법 추가)
// [추가] anchor: 누른 버튼의 getBoundingClientRect() — 넘기면 화면 가운데 대신 그 버튼 바로 아래(공간이 없으면 위)에 뜸
export const ConfirmDialog = ({ title, desc, confirmLabel, busy, onConfirm, onCancel, confirmDisabled = false, anchor = null, children }) => {
  const cancelRef = useRef(null);
  const boxRef = useRef(null);
  const [pos, setPos] = useState(null); // { top, left } · null = 화면 가운데

  // [추가] 누른 자리 기준 위치 (화면 밖으로 나가지 않게 16px 안쪽으로 맞춤)
  useLayoutEffect(() => {
    if (!anchor || !boxRef.current) return;
    const gap = 8;
    const edge = 16;
    const { offsetWidth: w, offsetHeight: h } = boxRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = anchor.bottom + gap;
    if (top + h > vh - edge && anchor.top - gap - h >= edge) top = anchor.top - gap - h; // 아래 공간이 없으면 위로
    top = Math.max(edge, Math.min(top, vh - h - edge));
    let left = anchor.left + anchor.width / 2 - w / 2;
    left = Math.max(edge, Math.min(left, vw - w - edge));
    setPos({ top, left });
  }, [anchor]);
  const latest = useRef({ busy, onCancel });
  latest.current = { busy, onCancel };

  // 열릴 때 1번: 취소 버튼에 포커스 · Esc 로 닫기 · 뒤 화면 스크롤 막기
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !latest.current.busy && latest.current.onCancel();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // [수정] body 에 바로 그림 (createPortal)
  // - 페이지 전환 애니메이션(.page-fade)의 transform 안에 있으면 position: fixed 가 화면이 아니라 페이지 전체 기준이 되어
  //   스크롤한 자리에서 누르면 팝업이 페이지 아래쪽(보이지 않는 곳)에 뜸 → 이제 항상 지금 보고 있는 화면 가운데
  return createPortal(
    <div
      className={`account-dialog-backdrop${anchor ? " is-anchored" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        ref={boxRef}
        className="account-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        style={anchor ? (pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }) : undefined}
      >
        <h2 id="account-dialog-title" className="account-dialog-title">{title}</h2>
        {desc && <p className="account-dialog-desc">{desc}</p>}
        {children}
        <div className="account-dialog-actions">
          <button ref={cancelRef} type="button" className="account-btn account-btn--secondary" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className="account-btn" onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
