// src/pages/AccountPayment.jsx
// [추가] 계정 설정 → "지불 방법 관리" (/profile/payment)
// - 지불 방법 카드 목록 (맨 위가 기본 · 기본으로 결제가 안 되면 위에서부터 순서대로 시도)
// - [+ 지불 방법 추가]: 카드사 · 끝 4자리만 입력 (데모용 · 카드 번호 전체는 받지 않음)
// - [순서 변경]: 카드 2개 이상일 때 · 위 / 아래로 옮기기 · 삭제 → [완료]
// - 글자 위계는 계정 설정과 같음 · 버튼 · 링크는 프라이머리
// - 스타일: App.scss "계정 설정 — 구독 관리 · 지불 방법" (.account-pay-*)
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, getPayments, PAYMENT_MAX } from "../store/useAuthStore";
import { AccountSubPage, AccountIcon, ConfirmDialog, CARD_BRANDS } from "../components/profile/AccountShared";
import { PAYMENT_URL } from "../data/appleLinks";

const newId = () => `pm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const MoreLink = () => (
  <a className="account-link account-link--inline" href={PAYMENT_URL} target="_blank" rel="noopener noreferrer">
    더 알아보기
    <span className="account-link-arrow" aria-hidden="true" />
  </a>
);

const AccountPayment = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const onSavePayments = useAuthStore((s) => s.onSavePayments);

  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState(CARD_BRANDS[0]);
  const [last4, setLast4] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!authReady) return <main className="account-page" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const payments = getPayments(user);
  const full = payments.length >= PAYMENT_MAX;

  const save = async (next, okText) => {
    setBusy(true);
    const ok = await onSavePayments(next);
    setBusy(false);
    setMessage(ok ? okText : "지불 방법을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    return ok;
  };

  const openAdd = () => {
    setBrand(CARD_BRANDS[0]);
    setLast4("");
    setAdding(true);
  };

  const add = async () => {
    if (!/^\d{4}$/.test(last4)) return;
    const ok = await save([...payments, { id: newId(), brand, last4 }], "지불 방법을 추가했어요.");
    if (ok) setAdding(false);
  };

  const move = (index, dir) => {
    const to = index + dir;
    if (to < 0 || to >= payments.length) return;
    const next = [...payments];
    [next[index], next[to]] = [next[to], next[index]];
    save(next, to === 0 || index === 0 ? "기본 지불 방법을 바꿨어요." : "순서를 바꿨어요.");
  };

  const remove = (id) => {
    const next = payments.filter((p) => p.id !== id);
    if (next.length < 2) setOrdering(false);
    save(next, "지불 방법을 삭제했어요.");
  };

  return (
    <AccountSubPage back="account-payment">
      <div className="account-sub-body account-pay">
        <h2 className="account-sub-heading">지불 방법</h2>

        <div className="account-item">
          <h3 className="account-item-title">미디어 구입 및 구독</h3>
          <p className="account-item-desc">
            Apple 계정에 여러 지불 방법을 추가하여 사용할 수 있습니다. 구입에 기본 지불 방법을 사용할 수 없는 경우
            Apple이 위에서부터 순서대로 다른 지불 방법으로 결제를 시도하도록 허용합니다. <MoreLink />
          </p>
          <p className="account-item-desc">
            설정된 국가 또는 지역에서 사용 가능한 지불 방법을 알아보십시오. <MoreLink />
          </p>
        </div>

        <div className="account-pay-layout">
          {payments.length === 0 ? (
            <p className="account-pay-empty account-item-desc">등록된 지불 방법이 없습니다.</p>
          ) : (
            <ol className="account-pay-list" aria-label="지불 방법 (위에서부터 결제 순서)">
              {payments.map((p, i) => (
                <li key={p.id} className="account-pay-card">
                  <div className="account-pay-card-text">
                    <strong className="account-pay-brand">{p.brand}</strong>
                    <span className="account-pay-number">•••• {p.last4}</span>
                    {i === 0 && <span className="account-pay-default">기본</span>}
                  </div>
                  {ordering ? (
                    <div className="account-pay-order">
                      <button type="button" className="account-pay-move" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`${p.brand} 위로`}>
                        ↑
                      </button>
                      <button type="button" className="account-pay-move" onClick={() => move(i, 1)} disabled={busy || i === payments.length - 1} aria-label={`${p.brand} 아래로`}>
                        ↓
                      </button>
                      <button type="button" className="account-link account-pay-remove" onClick={() => remove(p.id)} disabled={busy}>
                        삭제
                      </button>
                    </div>
                  ) : (
                    <span className="account-pay-card-icon" aria-hidden="true">
                      <AccountIcon name="card" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="account-pay-actions">
            <button type="button" className="account-icon-link" onClick={openAdd} disabled={busy || full}>
              <AccountIcon name="plus" />
              지불 방법 추가
            </button>
            <button
              type="button"
              className="account-icon-link"
              onClick={() => setOrdering((v) => !v)}
              disabled={busy || (payments.length < 2 && !ordering)}
              aria-pressed={ordering}
            >
              <AccountIcon name="order" />
              {ordering ? "완료" : "순서 변경"}
            </button>
            {full && <p className="account-note">지불 방법은 최대 {PAYMENT_MAX}개까지 등록할 수 있습니다.</p>}
          </div>
        </div>
      </div>

      {adding && (
        <ConfirmDialog
          title="지불 방법 추가"
          desc="카드사와 카드 번호 끝 4자리를 입력해 주세요."
          confirmLabel="추가"
          busy={busy}
          confirmDisabled={!/^\d{4}$/.test(last4)}
          onConfirm={add}
          onCancel={() => setAdding(false)}
        >
          <div className="account-form">
            <label className="account-field">
              <span className="account-item-title">카드사</span>
              <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                {CARD_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="account-field">
              <span className="account-item-title">카드 번호 끝 4자리</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="0000"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
            </label>
          </div>
        </ConfirmDialog>
      )}

      <p className={`account-toast${message ? " is-show" : ""}`} role="status" aria-live="polite">
        {message}
      </p>
    </AccountSubPage>
  );
};

export default AccountPayment;
