// src/pages/AccountSubscription.jsx
// [추가] 계정 설정 → 구독 "관리" (/profile/subscription)
// - 구독 중: Apple TV · 요금 · 갱신 예정일 / 가족과 공유 [가족 설정] / 관리 [모든 요금제 보기] [구독 취소]
// - 취소함: "구독을 취소했습니다." · 만료일 / [갱신] (다시 자동 갱신)
// - 구독 없음: "구독 중인 항목이 여기에 표시됩니다." / 옵션 [가족 이용 권한 관리]
// - 글자 위계는 계정 설정과 같음 (항목 제목 Heading/h5-B · 설명 Body/default · 안내 Body/small) · 버튼은 프라이머리
// - 스타일: App.scss "계정 설정 — 구독 관리 · 지불 방법" (.account-sub-*)
import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuthStore, PROFILE_MAX } from "../store/useAuthStore";
import { AccountSubPage, AccountIcon, ConfirmDialog, PLAN_INFO, getSubscriptionState } from "../components/profile/AccountShared";
import { PRIVACY_URL } from "../data/appleLinks";

const FAMILY_LINK = "/profile#account-profile"; // 가족(프로필) 설정 = 계정 설정 "다른 프로필로 보기"

// Apple TV 앱 아이콘 + 이름
const AppHead = () => (
  <div className="account-sub-app">
    <span className="account-sub-app-icon" aria-hidden="true">
      <img src="/icons/login-logo.svg" alt="" /> {/* [수정] 앱 아이콘 (배경 없이 칸 가득) */}
    </span>
    <h2 className="account-sub-heading">Apple TV</h2>
  </div>
);

// 가족과 공유
const FamilyBlock = () => (
  <div className="account-item">
    <h3 className="account-item-title">가족과 공유</h3>
    <p className="account-item-desc">최대 {PROFILE_MAX}명의 가족 구성원과 구독을 공유할 수 있습니다.</p>
    <Link className="account-outline-btn" to={FAMILY_LINK}>
      가족 설정
    </Link>
  </div>
);

// 모든 요금제 보기 → 요금제 목록 (지금 요금제 표시 · 다른 요금제를 고르면 다음 갱신부터 적용)
const PlanList = ({ current, onPick, busy }) => (
  <ul className="account-plan-list" aria-label="요금제">
    {Object.entries(PLAN_INFO).map(([key, plan]) => {
      const on = key === current;
      return (
        <li key={key}>
          <button
            type="button"
            className={`account-plan${on ? " is-on" : ""}`}
            aria-pressed={on}
            disabled={busy}
            onClick={() => !on && onPick(key)}
          >
            <span className="account-plan-name">{plan.name}</span>
            <span className="account-plan-price">{plan.price}</span>
            {on && <span className="account-plan-tag">현재 요금제</span>}
          </button>
        </li>
      );
    })}
  </ul>
);

const AccountSubscription = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const onCancelSubscription = useAuthStore((s) => s.onCancelSubscription);
  const onRenewSubscription = useAuthStore((s) => s.onRenewSubscription);
  const onChangePlan = useAuthStore((s) => s.onChangePlan);

  const [plansOpen, setPlansOpen] = useState(false);
  const [dialog, setDialog] = useState(false); // 구독 취소 확인
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!authReady) return <main className="account-page" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const sub = getSubscriptionState(user);

  const cancel = async () => {
    setBusy(true);
    const ok = await onCancelSubscription();
    setBusy(false);
    setDialog(false);
    setMessage(ok ? "구독을 취소했어요." : "구독을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  const renew = async () => {
    setBusy(true);
    const ok = await onRenewSubscription();
    setBusy(false);
    setMessage(ok ? "구독이 다시 자동 갱신돼요." : "갱신하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  const pickPlan = async (plan) => {
    setBusy(true);
    const ok = await onChangePlan(plan);
    setBusy(false);
    setMessage(ok ? `다음 갱신부터 ${PLAN_INFO[plan].name}이 적용돼요.` : "요금제를 바꾸지 못했어요.");
  };

  // 모든 요금제 보기 버튼 + 목록
  const plans = (
    <>
      <button
        type="button"
        className="account-outline-btn"
        aria-expanded={plansOpen}
        onClick={() => setPlansOpen((v) => !v)}
      >
        {plansOpen ? "요금제 닫기" : "모든 요금제 보기"}
      </button>
      {plansOpen && <PlanList current={sub.plan} onPick={pickPlan} busy={busy} />}
    </>
  );

  let content;

  if (sub.state === "none") {
    // ---------- 구독 없음 ----------
    content = (
      <div className="account-sub-body">
        <div className="account-sub-empty">
          <h2 className="account-item-title">구독 중인 항목이 여기에 표시됩니다.</h2>
          <p className="account-item-desc">앱 또는 서비스를 구독하는 경우 여기서 구독 항목을 확인하거나 관리할 수 있습니다.</p>
        </div>

        <div className="account-item">
          <h3 className="account-item-title">옵션</h3>
          <div className="account-sub-actions">
            <Link className="account-outline-btn" to="/subscribe" state={{ from: location.pathname }}>
              모든 요금제 보기
            </Link>
            <Link className="account-outline-btn" to={FAMILY_LINK}>
              가족 이용 권한 관리
            </Link>
          </div>
        </div>
      </div>
    );
  } else {
    // ---------- 구독 중 · 취소함 ----------
    const canceled = sub.state === "canceled";
    content = (
      <>
        <div className="account-sub-body account-sub-body--line">
          <AppHead />

          <div className="account-item">
            <h3 className="account-item-title">{sub.info.name}</h3>
            {sub.trial && <p className="account-item-desc">7일 무료 체험 중</p>}
          </div>

          {canceled ? (
            <div className="account-item">
              <p className="account-sub-canceled">구독을 취소했습니다.</p>
              <p className="account-note">구독이 {sub.endDate}에 만료됩니다.</p>
              <button type="button" className="account-fill-btn" onClick={renew} disabled={busy}>
                갱신: {sub.info.renewLabel}
              </button>
            </div>
          ) : (
            <ul className="account-sub-facts">
              <li>
                <AccountIcon name="card" />
                {sub.trial ? `무료 체험 후 ${sub.info.price}` : sub.info.price}
              </li>
              <li>
                <AccountIcon name="calendar" />
                {sub.endDate}에 {sub.trial ? "첫 결제 예정" : "갱신 예정"}
              </li>
            </ul>
          )}
        </div>

        <div className="account-sub-body">
          <FamilyBlock />

          {canceled ? (
            <div className="account-item">{plans}</div>
          ) : (
            <div className="account-item">
              <h3 className="account-item-title">관리</h3>
              {plans}
              {/* [수정] 다크 UX: 구독 취소는 눈에 덜 띄게 (색 없는 글자 버튼 · 회색 글자) */}
              <button type="button" className="account-quiet-btn" onClick={() => setDialog(true)}>
                구독 취소
              </button>
              <p className="account-note">지금 취소해도 {sub.endDate}까지 구독한 서비스를 계속 이용할 수 있습니다.</p>
            </div>
          )}

          {/* [수정] 외부 새 창 → 사이트 안 /privacy */}
          <Link className="account-link" to={PRIVACY_URL}>
            구독 및 개인정보 보호에 관하여
          </Link>
        </div>
      </>
    );
  }

  return (
    <AccountSubPage back="account-subscription">
      {content}

      {dialog && (
        <ConfirmDialog
          title="구독을 취소할까요?"
          desc={`${sub.endDate}까지는 계속 이용할 수 있고, 그 뒤에는 자동으로 갱신되지 않습니다.`}
          confirmLabel="구독 취소"
          busy={busy}
          onConfirm={cancel}
          onCancel={() => setDialog(false)}
        />
      )}

      <p className={`account-toast${message ? " is-show" : ""}`} role="status" aria-live="polite">
        {message}
      </p>
    </AccountSubPage>
  );
};

export default AccountSubscription;
