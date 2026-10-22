import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../store/useAuthStore";
import { MANAGE_URL, PAYMENT_URL } from "../data/appleLinks";
import "../subscribe.scss";

/* ------------------------------------------------------------------ */
/* 상수 / 유틸                                                         */
/* ------------------------------------------------------------------ */

// 가격/문구는 여기 한 곳에서만 관리
const PLANS = [
  {
    id: "monthly",
    name: "Apple TV 월간 플랜",
    price: "7일 무료 체험 후 월 ₩6,500",
    note: "무료 체험은 대상 계정에 한해 제공됩니다.",
    amount: "₩6,500",
    perUnit: "₩6,500 / 월",
    days: 30, // startTrial(서버)의 기간과 동일
  },
  {
    id: "yearly",
    name: "Apple TV 연간 플랜",
    price: "7일 무료 체험 후 연 ₩65,000",
    note: "1년 단위로 이용하고 자동 갱신됩니다.",
    amount: "₩65,000",
    perUnit: "₩65,000 / 년",
    days: 365,
  },
];

const BENEFITS = [
  { title: "새로운 이야기, 계속 업데이트", desc: "매주 새로운 작품과 에피소드" },
  { title: "다양한 기기에서 시청", desc: "지원되는 기기의 Apple TV 앱과 웹" },
  { title: "Apple Original 광고 없이 시청", desc: "독점 시리즈와 영화, 다큐멘터리, 키즈 콘텐츠" },
  { title: "가족과 함께 이용", desc: "본인을 포함해 최대 6명이 구독 공유" },
];

const DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
const PROCESSING_MS = 1600; // 처리 중 화면 최소 노출 시간 (UI 연출용)

const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
};
const toMillis = (v) => (v?.toMillis ? v.toMillis() : v);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// a1234@example.com → a••••@example.com
const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "Apple 계정";
  const [id, domain] = email.split("@");
  return `${id[0]}••••@${domain}`;
};

/* ------------------------------------------------------------------ */
/* 공통 껍데기 (기존 login-page / login-card 재사용)                      */
/* ------------------------------------------------------------------ */

const Shell = ({ step, onClose, children }) => (
  <main className="login-page">
    <div className={`login-card plan-card plan-card--${step}`}>
      {onClose && (
        <button
          type="button"
          className="login-card-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className="login-logo-area">
        <div className="login-app-icon" />
      </div>
      {children}
    </div>
  </main>
);

/* ------------------------------------------------------------------ */
/* 페이지: plan → confirm → processing → done                           */
/* ------------------------------------------------------------------ */

const Subscribe = () => {
  const navigate = useNavigate();
  const { user, authReady, loginError, onStartTrial, clearLoginError } = useAuthStore();

  const [step, setStep] = useState("plan"); // plan | confirm | processing | done
  const [plan, setPlan] = useState("monthly");
  const [startedAsTrial, setStartedAsTrial] = useState(true);

  useEffect(() => {
    clearLoginError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 가드: 새로고침 복원 전에는 그리지 않음
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  // 구독 중이면 홈으로. 단, 방금 시작한 처리 중/완료 화면은 보여줘야 함
  if (isSubscribed(user) && step !== "processing" && step !== "done") {
    return <Navigate to="/" replace />;
  }

  const planObj = PLANS.find((p) => p.id === plan);
  const trialEligible = !user.trialUsed; // 체험 이력이 없으면 7일 무료 체험
  const goHome = () => navigate("/", { replace: true });

  const goConfirm = () => {
    clearLoginError();
    setStep("confirm");
  };

  const handleStart = async () => {
    if (step !== "confirm") return;
    setStartedAsTrial(trialEligible);
    clearLoginError();
    setStep("processing");
    // 서버 기록(Firestore)과 최소 노출 시간을 동시에 기다림
    const [u] = await Promise.all([onStartTrial(plan), wait(PROCESSING_MS)]);
    setStep(u ? "done" : "confirm"); // 실패하면 확인 화면으로 돌아가 에러 표시
  };

  /* ---------------- 1. 플랜 선택 ---------------- */
  if (step === "plan") {
    return (
      <Shell step={step} onClose={goHome}>
        <h2 className="login-title">이용 가능한 플랜</h2>
        <p className="login-desc">Apple TV를 구독하고 Apple Original을 즐기세요.</p>

        <div className="plan-body">
          <div className="plan-list" role="radiogroup" aria-label="구독 플랜 선택">
            {PLANS.map((p) => (
              <label
                key={p.id}
                className={`plan-option ${plan === p.id ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="plan"
                  className="plan-radio"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id)}
                />
                <span className="plan-name">{p.name}</span>
                <span className="plan-price">{p.price}</span>
                <span className="plan-note">{p.note}</span>
                <span className="plan-radio-mark" aria-hidden="true" />
              </label>
            ))}
          </div>

          <h3 className="plan-section-title">포함 혜택</h3>
          <ul className="plan-benefits">
            {BENEFITS.map((b) => (
              <li key={b.title} className="plan-benefit">
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
              </li>
            ))}
          </ul>

          <button type="button" className="plan-submit" onClick={goConfirm}>
            계속
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------------- 2. 내용 확인 ---------------- */
  if (step === "confirm") {
    const endMs = Date.now() + (trialEligible ? TRIAL_DAYS : planObj.days) * DAY;
    const rows = trialEligible
      ? [
          ["선택한 플랜", planObj.name],
          ["오늘 결제 금액", "₩0"],
          ["무료 체험 종료일", fmtDate(endMs)],
          ["체험 후 요금", planObj.perUnit],
        ]
      : [
          ["선택한 플랜", planObj.name],
          ["오늘 결제 금액", planObj.amount],
          ["다음 갱신일", fmtDate(endMs)],
          ["갱신 요금", planObj.perUnit],
        ];

    return (
      <Shell step={step} onClose={goHome}>
        <h2 className="login-title">
          {trialEligible ? "무료 체험 내용을 확인하세요" : "구독 내용을 확인하세요"}
        </h2>
        <p className="login-desc">선택한 플랜과 결제 조건을 확인한 후 시작하세요.</p>

        <div className="plan-body">
          <dl className="plan-summary">
            {rows.map(([label, value]) => (
              <div className="plan-summary-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="plan-field">
            <span className="plan-field-label">Apple 계정</span>
            <span className="plan-field-value">{maskEmail(user.email)}</span>
          </div>
          <div className="plan-field">
            <span className="plan-field-label">결제 방법</span>
            <span className="plan-field-value">등록된 결제 수단으로 결제</span>
          </div>

          <div className="plan-links">
            <a
              className="plan-link plan-link--muted"
              href={PAYMENT_URL}
              target="_blank"
              rel="noreferrer"
            >
              결제 방법 확인·변경 ↗
            </a>
            <button
              type="button"
              className="plan-link plan-link--blue"
              onClick={() => setStep("plan")}
            >
              플랜 다시 선택
            </button>
          </div>

          {loginError && (
            <p className="plan-error" role="alert">
              {loginError}
            </p>
          )}

          <button type="button" className="plan-submit" onClick={handleStart}>
            {trialEligible ? "7일 무료 체험 시작" : "구독 시작"}
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------------- 3. 처리 중 (닫기 버튼 없음) ---------------- */
  if (step === "processing") {
    return (
      <Shell step={step}>
        <h2 className="login-title">
          {startedAsTrial ? "무료 체험을 시작하고 있습니다" : "구독을 시작하고 있습니다"}
        </h2>
        <p className="login-desc">완료될 때까지 잠시 기다려 주세요.</p>
        <div className="plan-spinner" aria-hidden="true" />
        <p className="plan-proc-name">{planObj.name}</p>
        <p className="plan-proc-note" role="status">
          {startedAsTrial
            ? "계정의 체험 혜택을 적용하고 있습니다."
            : "계정에 구독을 적용하고 있습니다."}
        </p>
        <button type="button" className="plan-submit plan-submit--wait" disabled>
          처리 중…
        </button>
      </Shell>
    );
  }

  /* ---------------- 4. 완료 ---------------- */
  const sub = user.subscription || {};
  const donePlan = PLANS.find((p) => p.id === sub.plan) || planObj;
  const endMs = toMillis(sub.expiresAt) || Date.now() + TRIAL_DAYS * DAY;

  return (
    <Shell step={step} onClose={goHome}>
      <h2 className="login-title">
        {startedAsTrial ? "7일 무료 체험이 시작됐어요" : "구독이 시작됐어요"}
      </h2>
      <p className="login-desc">이제 Apple Original의 이야기를 즐겨보세요.</p>

      <div className="plan-body">
        <div className="plan-done-box">
          <strong>{donePlan.name}</strong>
          <span>
            {startedAsTrial
              ? `무료 체험 중 · ${fmtDate(endMs)}부터 ${donePlan.perUnit.replace(" / ", " ")}`
              : `구독 중 · ${fmtDate(endMs)}에 갱신 · ${donePlan.perUnit}`}
          </span>
          <span>오늘 결제 금액 {startedAsTrial ? "₩0" : donePlan.amount}</span>
        </div>
        <p className="plan-done-note">
          구독 내역과 갱신 일정은 Apple 계정에서 확인할 수 있습니다.
        </p>

        <button type="button" className="plan-submit" onClick={goHome}>
          홈으로 돌아가 시청하기
        </button>
        <a className="plan-manage" href={MANAGE_URL} target="_blank" rel="noreferrer">
          구독 관리 ↗
        </a>
      </div>
    </Shell>
  );
};

export default Subscribe;
