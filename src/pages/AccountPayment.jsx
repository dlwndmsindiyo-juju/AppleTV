import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, getPayments, PAYMENT_MAX } from "../store/useAuthStore";
import { AccountSubPage, ConfirmDialog, CARD_BRANDS } from "../components/profile/AccountShared";
import { PAYMENT_URL } from "../data/appleLinks";

const makeId = () =>
  `pm_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const METHODS = [
  {
    value: "card",
    label: "신용/체크카드",
    desc: "카드 정보 입력 후 등록",
  },
  {
    value: "pay",
    label: "간편결제",
    desc: "카카오페이 · 네이버페이 · 토스페이",
  },
  {
    value: "phone",
    label: "휴대폰 결제",
    desc: "통신사 정보 입력 및 인증",
  },
  {
    value: "apple",
    label: "Apple 계정 잔액",
    desc: "잔액은 별도 관리",
  },
];

const PAY_PROVIDERS = [
  {
    value: "카카오페이",
    desc: "모의 인증으로 연결",
    tone: "kakao",
    accountHint: "@kakao.com",
  },
  {
    value: "네이버페이",
    desc: "모의 인증으로 연결",
    tone: "naver",
    accountHint: "@naver.com",
  },
  {
    value: "토스페이",
    desc: "모의 인증으로 연결",
    tone: "toss",
    accountHint: "@toss.im",
  },
];

const INITIAL = {
  method: "card",
  brand: CARD_BRANDS[0],
  last4: "",
  provider: PAY_PROVIDERS[0].value,
  carrier: "SKT",
  phone: "",
  holder: "",
};

const digits = (value) => value.replace(/\D/g, "");

const maskPhone = (value) =>
  value ? `${value.slice(0, 3)}-****-${value.slice(-4)}` : "";

const getProviderMeta = (provider) =>
  PAY_PROVIDERS.find((item) => item.value === provider) || PAY_PROVIDERS[0];

const getPaymentMeta = (payment) => {
  if (payment.method === "phone") {
    return {
      type: "phone",
      title: "휴대폰 결제",
      detail: `${payment.carrier || ""} ${payment.phoneMasked || ""}`.trim(),
      badge: "phone",
      badgeText: "휴",
    };
  }

  if (payment.method === "pay") {
    const provider = payment.provider || payment.brand || "간편결제";
    const meta = getProviderMeta(provider);

    return {
      type: "pay",
      title: provider,
      detail: payment.isDefault
        ? "기본결제수단"
        : "간편결제 연결됨",
      badge: meta.tone,
      badgeText:
        provider === "카카오페이"
          ? "pay"
          : provider === "네이버페이"
            ? "N"
            : "toss",
    };
  }

  return {
    type: "card",
    title: payment.brand || "신용/체크카드",
    detail: `•••• ${payment.last4 || "----"}`,
    badge: "card",
    badgeText: "💳",
  };
};

function MoreMenu({ isDefault, onDefault, onDelete, onClose }) {
  return (
    <div className="account-pay-more-menu">
      {!isDefault && (
        <button type="button" onClick={onDefault}>
          기본 결제 수단으로 설정
        </button>
      )}
      <button
        type="button"
        className="is-danger"
        onClick={onDelete}
      >
        삭제
      </button>
      <button type="button" className="is-close" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}

export default function AccountPayment() {
  const location = useLocation();

  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const onSavePayments = useAuthStore((s) => s.onSavePayments);

  const [step, setStep] = useState("closed");
  const [form, setForm] = useState(INITIAL);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!menuOpenId) return;

    const handleClickOutside = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

  if (!authReady) return <main className="account-page" />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const payments = getPayments(user);
  const full = payments.length >= PAYMENT_MAX;

  const providerMeta = getProviderMeta(form.provider);

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const closeModal = () => {
    if (!busy) setStep("closed");
  };

  const save = async (next, successText) => {
    setBusy(true);

    try {
      const ok = await onSavePayments(next);
      setMessage(ok ? successText : "지불 방법을 저장하지 못했어요.");
      return Boolean(ok);
    } catch {
      setMessage("저장 중 오류가 발생했어요.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    if (busy || full) return;
    setForm({ ...INITIAL });
    setStep("select");
  };

  const isCardValid = /^\d{4}$/.test(form.last4);

  const isPhoneValid =
    /^01\d{8,9}$/.test(digits(form.phone)) &&
    form.holder.trim().length >= 2;

  const next = () => {
    if (form.method === "apple") return;

    if (step === "select") {
      setStep("form");
      return;
    }

    if (step === "form" && form.method === "card" && isCardValid) {
      void register();
      return;
    }

    if (step === "form" && form.method === "pay") {
      setStep("verify");
      return;
    }

    if (step === "form" && form.method === "phone" && isPhoneValid) {
      setStep("verify");
    }
  };

  const register = async () => {
    if (busy || full) return;
    if (form.method === "card" && !isCardValid) return;
    if (form.method === "phone" && !isPhoneValid) return;

    const base = {
      id: makeId(),
      method: form.method,
    };

    let entry = null;

    if (form.method === "card") {
      entry = {
        ...base,
        brand: form.brand,
        last4: form.last4,
      };
    }

    if (form.method === "pay") {
      entry = {
        ...base,
        brand: form.provider,
        provider: form.provider,
        last4: "",
      };
    }

    if (form.method === "phone") {
      entry = {
        ...base,
        brand: "휴대폰 결제",
        carrier: form.carrier,
        phoneMasked: maskPhone(digits(form.phone)),
        last4: digits(form.phone).slice(-4),
      };
    }

    if (!entry) return;

    const ok = await save(
      [...payments, entry],
      "지불 방법이 등록되었습니다."
    );

    if (ok) setStep("closed");
  };

  const setAsDefault = async (targetId) => {
    if (busy) return;

    const currentIndex = payments.findIndex((item) => item.id === targetId);
    if (currentIndex <= 0) {
      setMenuOpenId(null);
      return;
    }

    const selected = payments[currentIndex];
    const rest = payments.filter((item) => item.id !== targetId);
    const nextPayments = [selected, ...rest];

    const ok = await save(nextPayments, "기본 결제 수단을 변경했어요.");
    if (ok) setMenuOpenId(null);
  };

  const remove = async () => {
    if (busy || !removing) return;

    const nextPayments = payments.filter((item) => item.id !== removing.id);

    const ok = await save(nextPayments, "지불 방법을 삭제했어요.");
    if (ok) {
      setRemoving(null);
      setMenuOpenId(null);
    }
  };

  return (
    <AccountSubPage back="account-payment">
      <div className="account-sub-body account-pay">
        <h2 className="account-sub-heading">지불 방법</h2>

        <div className="account-item">
          <h3 className="account-item-title">미디어 구입 및 구독</h3>
          <p className="account-item-desc">
            위에서부터 결제 우선순위가 적용됩니다. 실제 Apple 계정의 결제 수단은
            이 화면에서 변경되지 않습니다.{" "}
            <a
              className="account-link"
              href={PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              더 알아보기
            </a>
          </p>
        </div>

        <div className="account-pay-layout">
          {payments.length === 0 ? (
            <p className="account-pay-empty account-item-desc">
              등록된 지불 방법이 없습니다.
            </p>
          ) : (
            <ol className="account-pay-list" aria-label="등록된 지불 방법">
              {payments.map((payment, index) => {
                const meta = getPaymentMeta(payment);
                const isDefault = index === 0;

                return (
                  <li key={payment.id} className="account-pay-card">
                    <div className="account-pay-item-left">
                      <span
                        className={`account-pay-badge is-${meta.badge}`}
                        aria-hidden="true"
                      >
                        {meta.badgeText}
                      </span>

                      <div className="account-pay-card-text">
                        <strong className="account-pay-brand">{meta.title}</strong>
                        <span className="account-pay-number">{meta.detail}</span>
                        {isDefault && (
                          <span className="account-pay-default">기본결제수단</span>
                        )}
                      </div>
                    </div>

                    <div className="account-pay-item-right" ref={menuOpenId === payment.id ? menuRef : null}>
                      <button
                        type="button"
                        className="account-pay-more"
                        aria-label={`${meta.title} 더보기`}
                        onClick={() =>
                          setMenuOpenId((prev) =>
                            prev === payment.id ? null : payment.id
                          )
                        }
                      >
                        ⋯
                      </button>

                      {menuOpenId === payment.id && (
                        <MoreMenu
                          isDefault={isDefault}
                          onDefault={() => setAsDefault(payment.id)}
                          onDelete={() => setRemoving(payment)}
                          onClose={() => setMenuOpenId(null)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="account-pay-actions">
            <button
              className="account-icon-link"
              type="button"
              onClick={openAdd}
              disabled={busy || full}
            >
              <span className="account-inline-plus">＋</span>
              지불 방법 추가
            </button>

            {full && (
              <p className="account-note">
                최대 {PAYMENT_MAX}개까지 등록할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {step !== "closed" && (
        <div
          className="account-pay-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="account-pay-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-flow-title"
          >
            <div className="account-pay-modal-head">
              <h3 id="payment-flow-title">
                {step === "select"
                  ? "지불 방법 추가"
                  : step === "form"
                    ? form.method === "phone"
                      ? "휴대폰"
                      : form.method === "pay"
                        ? `${form.provider} 연결`
                        : "신용/체크카드"
                    : `${form.provider} 인증`}
              </h3>

              <button
                type="button"
                className="account-pay-close"
                aria-label="닫기"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="account-pay-modal-body">
              {step === "select" && (
                <>
                  <p className="account-item-desc">
                    지불 방법을 선택하세요.
                  </p>

                  <div className="account-pay-methods">
                    {METHODS.map((m) => (
                      <label
                        key={m.value}
                        className={`account-pay-method${form.method === m.value ? " is-selected" : ""
                          }`}
                      >
                        <span className="account-pay-method-radio">
                          <input
                            type="radio"
                            name="payment-method"
                            value={m.value}
                            checked={form.method === m.value}
                            onChange={() => update("method", m.value)}
                          />
                          <span className="account-pay-method-radio-ui" />
                        </span>

                        <span className="account-pay-method-copy">
                          <strong>{m.label}</strong>
                          <small>{m.desc}</small>
                        </span>
                      </label>
                    ))}
                  </div>

                  {form.method === "apple" && (
                    <p className="account-pay-help">
                      Apple 계정 잔액은 이 화면에서 새로 등록하지 않습니다.
                    </p>
                  )}
                </>
              )}

              {step === "form" && form.method === "card" && (
                <div className="account-pay-fields">
                  <label>
                    카드사
                    <select
                      value={form.brand}
                      onChange={(e) => update("brand", e.target.value)}
                    >
                      {CARD_BRANDS.map((brand) => (
                        <option key={brand}>{brand}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    카드 번호 끝 4자리
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="off"
                      placeholder="1234"
                      value={form.last4}
                      onChange={(e) =>
                        update("last4", digits(e.target.value).slice(0, 4))
                      }
                    />
                  </label>

                  <p className="account-pay-help">
                    데모 화면이므로 전체 카드번호와 유효기간은 저장하지 않습니다.
                  </p>
                </div>
              )}

              {step === "form" && form.method === "pay" && (
                <div className="account-pay-fields">
                  <p className="account-item-desc">
                    사용할 간편결제 서비스를 선택하세요.
                  </p>

                  <div className="account-pay-methods account-pay-methods--provider">
                    {PAY_PROVIDERS.map((item) => (
                      <label
                        key={item.value}
                        className={`account-pay-method account-pay-method--provider${form.provider === item.value ? " is-selected" : ""
                          }`}
                      >
                        <span className="account-pay-method-radio">
                          <input
                            type="radio"
                            name="pay-provider"
                            checked={form.provider === item.value}
                            onChange={() => update("provider", item.value)}
                          />
                          <span className="account-pay-method-radio-ui" />
                        </span>

                        <span className={`account-pay-provider-badge is-${item.tone}`}>
                          {item.value === "카카오페이"
                            ? "pay"
                            : item.value === "네이버페이"
                              ? "N"
                              : "toss"}
                        </span>

                        <span className="account-pay-method-copy">
                          <strong>{item.value}</strong>
                          <small>{item.desc}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === "form" && form.method === "phone" && (
                <div className="account-pay-fields">
                  <label>
                    통신사
                    <select
                      value={form.carrier}
                      onChange={(e) => update("carrier", e.target.value)}
                    >
                      <option>SKT</option>
                      <option>KT</option>
                      <option>LG U+</option>
                    </select>
                  </label>

                  <label>
                    휴대폰 번호
                    <input
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="01012345678"
                      value={form.phone}
                      onChange={(e) =>
                        update("phone", digits(e.target.value).slice(0, 11))
                      }
                    />
                  </label>

                  <label>
                    명의자
                    <input
                      autoComplete="off"
                      placeholder="이름"
                      value={form.holder}
                      onChange={(e) => update("holder", e.target.value)}
                    />
                  </label>

                  <p className="account-pay-help">
                    실제 SMS 인증 대신 데모 인증 화면으로 진행됩니다.
                  </p>
                </div>
              )}

              {step === "verify" && form.method === "pay" && (
                <div className={`account-pay-auth account-pay-auth--${providerMeta.tone}`}>
                  <div className="account-pay-auth-brand">
                    <span className={`account-pay-provider-badge is-${providerMeta.tone}`}>
                      {form.provider === "카카오페이"
                        ? "pay"
                        : form.provider === "네이버페이"
                          ? "N"
                          : "toss"}
                    </span>
                    <div>
                      <strong>{form.provider}</strong>
                      <small>{providerMeta.accountHint}</small>
                    </div>
                  </div>

                  <div className="account-pay-auth-box">
                    <div className="account-pay-auth-row">
                      <span>지불 방법</span>
                      <strong>{form.provider}</strong>
                    </div>
                    <div className="account-pay-auth-row">
                      <span>계정</span>
                      <strong>{providerMeta.accountHint}</strong>
                    </div>
                    <div className="account-pay-auth-row">
                      <span>상태</span>
                      <strong>인증 대기</strong>
                    </div>
                  </div>

                  <p className="account-pay-help">
                    첨부해주신 iOS 결제 연동 화면을 참고한 모의 인증 단계입니다.
                  </p>
                </div>
              )}

              {step === "verify" && form.method === "phone" && (
                <div className="account-pay-auth account-pay-auth--phone">
                  <div className="account-pay-auth-brand">
                    <span className="account-pay-provider-badge is-phone">휴</span>
                    <div>
                      <strong>휴대폰 결제</strong>
                      <small>{form.carrier}</small>
                    </div>
                  </div>

                  <div className="account-pay-auth-box">
                    <div className="account-pay-auth-row">
                      <span>지불 방법</span>
                      <strong>휴대폰</strong>
                    </div>
                    <div className="account-pay-auth-row">
                      <span>전화번호</span>
                      <strong>{maskPhone(digits(form.phone))}</strong>
                    </div>
                    <div className="account-pay-auth-row">
                      <span>인증 상태</span>
                      <strong>확인됨</strong>
                    </div>
                  </div>

                  <p className="account-pay-help">
                    실제 확인 코드 전송 없이 화면 흐름만 재현합니다.
                  </p>
                </div>
              )}
            </div>

            <div className="account-pay-modal-footer">
              <button
                className="account-pay-secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  step === "select"
                    ? closeModal()
                    : setStep(step === "verify" ? "form" : "select")
                }
              >
                {step === "select" ? "취소" : "뒤로"}
              </button>

              <button
                className="account-pay-primary"
                type="button"
                disabled={
                  busy ||
                  (step === "select" && form.method === "apple") ||
                  (step === "form" && form.method === "card" && !isCardValid) ||
                  (step === "form" && form.method === "phone" && !isPhoneValid)
                }
                onClick={step === "verify" ? register : next}
              >
                {busy
                  ? "저장 중..."
                  : step === "verify"
                    ? "완료"
                    : step === "form" && form.method === "card"
                      ? "등록"
                      : "계속"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title="지불 방법을 삭제할까요?"
          desc={`"${getPaymentMeta(removing).title}" 항목을 삭제합니다.${payments[0]?.id === removing.id && payments.length > 1
              ? " 삭제하면 다음 결제 수단이 기본으로 설정됩니다."
              : ""
            }`}
          confirmLabel="삭제"
          busy={busy}
          onConfirm={remove}
          onCancel={() => {
            if (!busy) setRemoving(null);
          }}
        />
      )}

      <p
        className={`account-toast${message ? " is-show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </AccountSubPage>
  );
}