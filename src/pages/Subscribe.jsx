// src/pages/Subscribe.jsx
// 구독 플로우 (시안)
// 1. 이용 가능한 플랜 → 2. 구독 내용을 확인하세요 → 3. 완료 / 실패
// - 로그인 전이면 로그인으로, 이미 구독 중인 계정이 들어오면 화면 없이 원래 화면으로 이동
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../store/useAuthStore";
import { MANAGE_URL } from "../data/appleLinks";
// 로그인 · 구독 카드 스타일(.auth-*)은 App.scss 맨 아래에 있음

// =====================================================================
// 로그인 · 구독 공용 카드 조각 (Login.jsx 에도 같은 코드가 있음 — 바꿀 때 함께 수정)
// =====================================================================
// 외부(Apple 공식) 링크 — 주소가 바뀌면 여기만 수정
const APPLE_LINKS = {
  privacy: "https://www.apple.com/kr/legal/privacy/",
  recover: "https://iforgot.apple.com/",
  watch: "https://tv.apple.com/kr",
  manage: MANAGE_URL, // 무료 체험 안내(TrialWelcome)와 같은 구독 관리 주소
};

// 카드 껍데기: 닫기 버튼 + 로고(public/icons/header-icon.svg) + 단계별 내용
// stepKey 가 바뀔 때마다 내용이 아래에서 살짝 올라오며 나타남
const AuthCard = ({ wide = false, onClose, stepKey, children }) => (
  <main className="auth-page page-fade">
    <div className={`auth-card${wide ? " auth-card--wide" : ""}`}>
      <button type="button" className="auth-close" onClick={onClose}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        닫기
      </button>

      <div className="auth-logo">
        <img src="/icons/header-icon.svg" alt="Apple TV" />
      </div>

      <div className="auth-step" key={stepKey}>
        {children}
      </div>
    </div>
  </main>
);

// 제목 + 설명
const AuthHead = ({ title, desc }) => (
  <>
    <h2 className="auth-title">{title}</h2>
    {desc && <p className="auth-desc">{desc}</p>}
  </>
);

// 라벨이 위에 붙은 입력 칸 (children 에 input, 또는 value 로 읽기 전용 값)
const AuthField = ({ label, value, children }) => (
  <label className="auth-field">
    <span className="auth-field-label">{label}</span>
    {children ?? <span className="auth-field-value">{value}</span>}
  </label>
);

// 회색 안내 박스 (제목 + 설명 여러 줄)
const AuthInfo = ({ title, lines = [] }) => (
  <div className="auth-info">
    <strong>{title}</strong>
    {lines.map((line) => (
      <p key={line}>{line}</p>
    ))}
  </div>
);

// 바깥 링크 (새 창 · ↗)
const ExternalLink = ({ href, className = "auth-link", children }) => (
  <a className={className} href={href} target="_blank" rel="noopener noreferrer">
    {children} <span className="ui-icon ui-icon-external" aria-hidden="true" />
  </a>
);


const AUTH_PATHS = ["/login", "/subscribe"];

const PLANS = {
  monthly: {
    name: "Apple TV 월간 플랜",
    price: "7일 무료 체험 후 월 ₩6,500",
    note: "무료 체험은 대상 계정에 한해 제공됩니다.",
    next: "무료 체험 계속",
    confirmDesc: "최종 확인 전에는 결제가 완료되지 않습니다.",
    summary: ["무료 체험 대상: 7일 무료 체험 후 월 ₩6,500", "체험 대상이 아닌 경우: 월 ₩6,500"],
    renew:
      "구독은 취소하기 전까지 자동 갱신됩니다. 다음 결제일, 적용 혜택과 결제 금액을 최종 결제 화면에서 확인하세요.",
    submit: "구독 확정",
  },
  yearly: {
    name: "Apple TV 연간 플랜",
    price: "연 ₩65,000",
    note: "1년 단위로 이용하고 자동 갱신됩니다.",
    next: "연간 플랜으로 계속",
    confirmDesc: "선택한 연간 플랜의 결제 조건을 확인하세요.",
    summary: ["연 ₩65,000 · 매년 자동 갱신", "무료 체험 적용 여부는 계정의 제공 혜택을 따릅니다."],
    renew: "구독은 취소하기 전까지 자동 갱신됩니다. 최종 결제 화면의 금액과 다음 결제일을 확인하세요.",
    submit: "연간 구독 확정",
  },
};

const BENEFITS = [
  { title: "광고 없이 시청", desc: "Apple Original 영화와 시리즈" },
  { title: "가족과 함께 이용", desc: "본인을 포함해 최대 6명" },
  { title: "다양한 기기에서 시청", desc: "지원되는 앱과 웹에서 이용" },
  { title: "고화질과 공간 음향", desc: "콘텐츠 · 기기별 지원 조건 적용" },
];

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = AUTH_PATHS.includes(location.state?.from) ? "/" : location.state?.from || "/";

  const { user, authReady, onStartTrial } = useAuthStore();

  // step: "plans" | "confirm" | "done" | "fail"
  const [step, setStep] = useState("plans");
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const enteredChecked = useRef(false);

  // 처음 들어왔을 때 1번만: 로그인 전 → 로그인 / 이미 구독 중 → 원래 화면
  useEffect(() => {
    if (!authReady || enteredChecked.current) return;
    enteredChecked.current = true;
    if (!user) navigate("/login", { replace: true, state: { from } });
    else if (isSubscribed(user)) navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const close = () => navigate(from, { replace: true });

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    const data = await onStartTrial(plan);
    setBusy(false);
    setStep(data ? "done" : "fail");
  };

  // 세션 확인 전 / 바로 이동할 계정은 빈 화면
  if (!authReady || !user || (isSubscribed(user) && step !== "done")) {
    return <main className="auth-page" />;
  }

  const p = PLANS[plan];
  let content = null;

  if (step === "plans") {
    content = (
      <>
        <AuthHead title="이용 가능한 플랜" desc="Apple TV를 구독하고 Apple Original을 즐기세요." />

        <div className="plan-options" role="radiogroup" aria-label="플랜 선택">
          {Object.entries(PLANS).map(([key, item]) => (
            <label key={key} className={`plan-opt${plan === key ? " on" : ""}`}>
              <input
                type="radio"
                name="plan"
                value={key}
                checked={plan === key}
                onChange={() => setPlan(key)}
              />
              <span className="plan-opt-text">
                <strong className="plan-opt-name">{item.name}</strong>
                <span className="plan-opt-price">{item.price}</span>
                <span className="plan-opt-note">{item.note}</span>
              </span>
              <span className="plan-opt-radio" aria-hidden="true" />
            </label>
          ))}
        </div>

        <h3 className="plan-benefit-title">포함 혜택</h3>
        <ul className="plan-benefit-list">
          {BENEFITS.map((b) => (
            <li key={b.title}>
              <strong>{b.title}</strong>
              <span>{b.desc}</span>
            </li>
          ))}
        </ul>

        <p className="plan-fineprint">
          타사 OTT 구독 · 대여 · 구입 콘텐츠와 Apple TV 4K 기기 구매는 포함되지 않습니다.
          <br />
          무료 체험과 제공 플랜은 계정의 자격에 따라 달라질 수 있습니다.
        </p>

        <div className="auth-actions auth-actions--row">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={close}>
            돌아가기
          </button>
          <button type="button" className="auth-btn" onClick={() => setStep("confirm")}>
            {p.next}
          </button>
        </div>
      </>
    );
  }

  if (step === "confirm") {
    content = (
      <>
        <AuthHead title="구독 내용을 확인하세요" desc={p.confirmDesc} />
        <AuthInfo title={p.name} lines={p.summary} />
        <div className="auth-fields auth-fields--full">
          <AuthField label="Apple 계정" value={user.email || ""} />
          <AuthField label="결제 방법" value="계정에 등록된 결제 수단 확인" />
        </div>
        <p className="auth-fineprint">{p.renew}</p>
        <div className="auth-actions">
          <button type="button" className="auth-btn" onClick={handleConfirm} disabled={busy}>
            {busy ? "처리 중..." : p.submit}
          </button>
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={() => setStep("plans")}
            disabled={busy}
          >
            플랜 다시 선택
          </button>
        </div>
      </>
    );
  }

  if (step === "done") {
    content = (
      <>
        <AuthHead
          title="Apple TV를 즐길 준비가 됐어요"
          desc="구독이 완료되었습니다. 같은 Apple 계정으로 지원 기기에서 시청하세요."
        />
        <AuthInfo
          title="구독 중"
          lines={["이용 중인 플랜과 다음 결제일은 계정의 구독 관리에서 확인할 수 있습니다."]}
        />
        <div className="auth-actions">
          <button
            type="button"
            className="auth-btn"
            onClick={() => navigate("/ecosystem", { replace: true })}
          >
            에코시스템 안내로 돌아가기
          </button>
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={() => navigate("/ecosystem#devices", { replace: true })}
          >
            내 기기에서 보는 방법
          </button>
        </div>
        <div className="auth-links">
          <ExternalLink href={APPLE_LINKS.watch}>Apple TV 시청하러 가기</ExternalLink>
        </div>
      </>
    );
  }

  if (step === "fail") {
    content = (
      <>
        <AuthHead
          title="구독을 완료하지 못했습니다"
          desc="결제 방법이나 연결 상태를 확인한 후 다시 시도하세요."
        />
        <AuthInfo
          title="선택한 플랜은 유지됩니다"
          lines={[
            "결제 내역을 먼저 확인해 중복 결제를 피하세요. 완료된 구독이 없다면 다시 진행할 수 있습니다.",
          ]}
        />
        <div className="auth-actions">
          <button type="button" className="auth-btn" onClick={() => setStep("confirm")}>
            결제 정보 다시 확인
          </button>
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={() => setStep("plans")}
          >
            플랜으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  return (
    <AuthCard wide={step === "plans"} onClose={close} stepKey={step}>
      {content}
    </AuthCard>
  );
};

export default Subscribe;
