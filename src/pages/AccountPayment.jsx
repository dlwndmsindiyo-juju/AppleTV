import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, getPayments, PAYMENT_MAX } from "../store/useAuthStore";
import { AccountSubPage, ConfirmDialog, CARD_BRANDS, CARD_BRAND_ICONS } from "../components/profile/AccountShared";
import { PAYMENT_URL } from "../data/appleLinks";
import { PaymentRegisterPopup } from "./Subscribe"; // [추가] 지불 방법 추가 = 구독 팝업의 지불 방법 등록 화면
// public 폴더의 파일은 import 없이 루트(/) 경로로 참조합니다.
// 실제 경로: public/pay-icon/*.svg, public/method-icon/*.svg
const METHOD_ICONS = {
  card: "/icons/method-icon/card.svg",
  pay: "/icons/method-icon/pay.svg",
  phone: "/icons/method-icon/phone.svg",
};
const PAY_ICONS = {
  "카카오페이": "/icons/pay-icon/kakaopay.svg",
  "네이버페이": "/icons/pay-icon/naverpay.svg",
  "토스페이": "/icons/pay-icon/tosspay.svg",
};

// [추가] 카드 오른쪽 로고: 카드사 로고 → 간편결제 로고 → 결제 유형 아이콘 순서로 찾음
// (brand 로도 찾으므로 저장 중 method · provider 가 빠져도 간편결제 로고가 나옴)
const getPaymentLogo = (payment, meta) =>
  CARD_BRAND_ICONS[payment.brand] ||
  PAY_ICONS[payment.provider] ||
  PAY_ICONS[payment.brand] ||
  METHOD_ICONS[meta.type];

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
    tone: "kakao",
    accountHint: "@kakao.com",
  },
  {
    value: "네이버페이",
    tone: "naver",
    accountHint: "@naver.com",
  },
  {
    value: "토스페이",
    tone: "toss",
    accountHint: "@toss.im",
  },
];

const INITIAL = {
  method: "card",
  brand: CARD_BRANDS[0],
  last4: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
  billingName: "",
  billingAddress: "",
  billingPostal: "",
  billingPhone: "",
  provider: PAY_PROVIDERS[0].value,
  carrier: "SKT",
  phone: "",
  holder: "",
};

const digits = (value) => value.replace(/\D/g, "");
const formatCardNumber = (value) =>
  digits(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (value) => {
  const raw = digits(value).slice(0, 4);
  return raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
};

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

  const [step, setStep] = useState("closed"); // (예전 지불 방법 추가 창 · 지금은 안 씀)
  const [addOpen, setAddOpen] = useState(false); // [추가] 지불 방법 등록 팝업
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

  // [수정] 지불 방법 추가 → 구독 팝업과 같은 "지불 방법 등록" 팝업
  const openAdd = () => {
    if (busy || full) return;
    setAddOpen(true);
  };

  const expiryMonth = Number(form.expiry.slice(0, 2));
  const expiryYear = Number(`20${form.expiry.slice(3, 5)}`);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCardValid =
    /^\d{13,19}$/.test(digits(form.cardNumber)) &&
    /^\d{2}\/\d{2}$/.test(form.expiry) &&
    expiryMonth >= 1 && expiryMonth <= 12 &&
    (expiryYear > currentYear || (expiryYear === currentYear && expiryMonth >= currentMonth)) &&
    /^\d{3,4}$/.test(form.cvc) &&
    form.billingName.trim().length >= 2 &&
    form.billingAddress.trim().length > 0 &&
    form.billingPostal.trim().length > 0 &&
    /^01\d{8,9}$/.test(digits(form.billingPhone));

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
        // 저장에는 마지막 4자리만 사용합니다. 전체 카드번호/CVC는 저장하지 않습니다.
        last4: digits(form.cardNumber).slice(-4),
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
                      <div className="account-pay-card-text">
                        <strong className="account-pay-brand">{meta.title}</strong>
                        <span className="account-pay-number">{meta.detail}</span>
                        {isDefault && (
                          <span className="account-pay-default">기본결제수단</span>
                        )}
                      </div>
                    </div>

                    <div className="account-pay-item-right" ref={menuOpenId === payment.id ? menuRef : null}>
                      {/* [수정] 카드사 로고: 시안처럼 카드 오른쪽 */}
                      <img className="account-pay-logo" src={getPaymentLogo(payment, meta)} alt="" aria-hidden="true" />
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
              <span className="account-inline-plus" aria-hidden="true" /> {/* [수정] 원형 테두리(border) + 플러스 아이콘(/icons/plus.svg) */}
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
                    : form.method === "phone"
                      ? "휴대폰 결제 인증"
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
                <div className="account-pay-fields account-pay-card-fields" style={{ minWidth: 0 }}>
                  <label>
                    <span>지불 방법 · 카드사</span>
                    <select value={form.brand} onChange={(e) => update("brand", e.target.value)}>
                      {CARD_BRANDS.map((brand) => <option key={brand}>{brand}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>카드 번호</span>
                    <input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      value={form.cardNumber}
                      onChange={(e) => update("cardNumber", formatCardNumber(e.target.value))}
                    />
                  </label>
                  <div className="account-pay-card-field-row" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                    <label>
                      <span>유효기간</span>
                      <input
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={form.expiry}
                        onChange={(e) => update("expiry", formatExpiry(e.target.value))}
                      />
                    </label>
                    <label>
                      <span>보안 코드</span>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="CVC"
                        maxLength={4}
                        value={form.cvc}
                        onChange={(e) => update("cvc", digits(e.target.value).slice(0, 4))}
                      />
                    </label>
                  </div>
                  <label>
                    <span>청구지 이름</span>
                    <input autoComplete="cc-name" placeholder="이름" value={form.billingName}
                      onChange={(e) => update("billingName", e.target.value)} />
                  </label>
                  <label>
                    <span>청구지 주소</span>
                    <input autoComplete="street-address" placeholder="도로명 주소" value={form.billingAddress}
                      onChange={(e) => update("billingAddress", e.target.value)} />
                  </label>
                  <label>
                    <span>우편번호</span>
                    <input autoComplete="postal-code" placeholder="우편번호" value={form.billingPostal}
                      onChange={(e) => update("billingPostal", e.target.value)} />
                  </label>
                  <label>
                    <span>전화번호</span>
                    <input type="tel" autoComplete="tel" placeholder="010-0000-0000"
                      value={form.billingPhone}
                      onChange={(e) => update("billingPhone", e.target.value)} />
                  </label>
                  <p className="account-pay-help">데모 화면입니다. 카드번호와 CVC는 저장되지 않습니다.</p>
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

                        <img className="account-pay-provider-image" style={{ width: 58, height: 48, objectFit: "contain", flexShrink: 0 }} src={PAY_ICONS[item.value]}
                          alt="" aria-hidden="true" />

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
                <div className="account-pay-fields account-pay-phone-fields">
                  <label style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <span style={{ whiteSpace: "nowrap" }}>통신사</span>
                    <select
                      style={{ minWidth: 0, paddingRight: 48 }}
                      value={form.carrier}
                      onChange={(e) => update("carrier", e.target.value)}
                    >
                      <option>SKT</option>
                      <option>KT</option>
                      <option>LG U+</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <span style={{ whiteSpace: "nowrap" }}>휴대폰 번호</span>
                    <input
                      style={{ minWidth: 0, boxSizing: "border-box" }}
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="01012345678"
                      value={form.phone}
                      onChange={(e) =>
                        update("phone", digits(e.target.value).slice(0, 11))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <span style={{ whiteSpace: "nowrap" }}>명의자</span>
                    <input
                      style={{ minWidth: 0, boxSizing: "border-box" }}
                      autoComplete="off"
                      placeholder="이름"
                      value={form.holder}
                      onChange={(e) => update("holder", e.target.value)}
                    />
                  </label>

                  <label style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", alignItems: "center", gap: 16, minWidth: 0 }}>
                    <span style={{ whiteSpace: "nowrap" }}>인증번호</span>
                    <input
                      style={{ minWidth: 0, boxSizing: "border-box" }}
                      autoComplete="number"
                      placeholder="1234"
                      value={form.last4}
                      onChange={(e) => update("last4", e.target.value)}
                    />
                  </label>

                  <p className="account-pay-help">
                    인증번호 발송까지 1분 정도 소요됩니다.
                  </p>
                </div>
              )}

              {step === "verify" && form.method === "pay" && (
                <div className={`account-pay-auth account-pay-auth--${providerMeta.tone}`}>
                  <div className="account-pay-auth-brand">
                    <img className="account-pay-provider-image" style={{ width: 58, height: 48, objectFit: "contain", flexShrink: 0 }} src={PAY_ICONS[form.provider]}
                      alt="" aria-hidden="true" />
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
                    앱에서 인증 후 완료 버튼을 눌러주세요
                  </p>
                </div>
              )}

              {step === "verify" && form.method === "phone" && (
                <div className="account-pay-auth account-pay-auth--phone">
                  <div className="account-pay-auth-brand">
                    <img className="account-pay-method-icon" style={{ width: 58, height: 48, objectFit: "contain", flexShrink: 0 }} src={METHOD_ICONS.phone} alt="" aria-hidden="true" />
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
                      <strong>데모 확인</strong>
                    </div>
                  </div>

                  <p className="account-pay-help">
                  결제 수단으로 등록되었습니다.
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

      {/* [추가] 지불 방법 등록 팝업 (저장은 팝업 안에서: 카드 종류 + 마지막 4자리 · 청구 주소) */}
      {addOpen && (
        <PaymentRegisterPopup
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            setMessage("지불 방법이 등록되었습니다.");
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