// src/pages/Subscribe.jsx
// [수정] 구독 팝업 (시안: Apple TV 구독하기 → 지불 방법 등록 → 구독 확인 → 구독 완료)
// - 헤더 · 푸터 없는 전체 화면 (App.jsx 에서 /subscribe 도 로그인처럼 독립 화면)
// - 위 왼쪽 "‹" 뒤로 · 오른쪽 "×" 닫기: 플랜 선택 · 지불 방법 등록 화면에만 (시안)
// - 로고: public/icons/login-logo.svg (로그인 화면과 같은 로고)
// - 등록된 지불 방법이 이미 있으면 지불 방법 등록은 건너뜀
// - 저장: 카드는 카드 종류 + 마지막 4자리만 · 청구 주소는 입력한 이름 · 주소 · 우편번호만
//   (카드번호 전체 · 유효기간 · 비밀번호 · 신원 확인 · 통신사 정보는 저장하지 않음)
// - 로그인 전이면 로그인으로, 이미 구독 중인 계정이 들어오면 화면 없이 원래 화면으로 이동
// - 스타일: App.scss "구독 팝업" (.sub-pop-*) · 휴대폰 mobile.scss
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed, getPayments, PAYMENT_MAX } from "../store/useAuthStore";
import { KOREA_REGIONS, SIDO_LIST } from "../data/koreaRegions";
import { PRIVACY_URL } from "../data/appleLinks";

const AUTH_PATHS = ["/login", "/subscribe"];
const TERMS_URL = "https://www.apple.com/kr/legal/internet-services/itunes/kr/terms.html";
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7; // useAuthStore 의 무료 체험 기간과 같음

const PLANS = {
  monthly: {
    name: "Apple TV 월간 플랜",
    trialPrice: "7일 무료 체험 후 월 ₩6,500",
    price: "월 ₩6,500",
    renew: "매월 ₩6,500",
  },
  yearly: {
    name: "Apple TV 연간 플랜",
    trialPrice: "연 ₩65,000",
    price: "연 ₩65,000",
    renew: "매년 ₩65,000",
  },
};

const BENEFITS = [
  "광고 없이 Apple Original 영화와 시리즈 시청",
  "하나의 계정으로 본인 포함 최대 5명 이용",
  "태블릿과 TV, 웹 등 다양한 기기에서 시청",
  "고화질과 현장감이 느껴지는 공간 음향 효과",
];

const PAY_METHODS = ["신용·체크카드"];
const CARRIERS = ["SKT", "KT", "LG U+", "SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"];
const NATIONALITIES = ["내국인", "외국인"];
const GENDERS = ["남성", "여성"];
const TERMS = [
  { key: "privacy", label: "[필수] 개인정보 수집 및 이용 동의" },
  { key: "identity", label: "[필수] 본인 확인 서비스 이용약관 동의" },
  { key: "provide", label: "[필수] 개인정보 제공 및 위탁 동의" },
];

const EMPTY_FORM = {
  method: PAY_METHODS[0],
  cardNumber: "",
  expiry: "",
  cardPw: "",
  lastName: "",
  firstName: "",
  road: "",
  detail: "",
  sido: "",
  sigungu: "",
  postal: "",
  idName: "",
  birth: "",
  carrier: "",
  phone: "",
  nationality: "",
  gender: "",
  terms: { privacy: false, identity: false, provide: false },
};

// ---------- 날짜 · 입력 모양 ----------
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
const fmtKo = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDot = (d) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;

const digits = (v) => v.replace(/\D/g, "");
const fmtCard = (v) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const fmtExpiry = (v) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const fmtBirth = (v) => {
  const d = digits(v).slice(0, 8);
  if (d.length > 6) return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6)}`;
  if (d.length > 4) return `${d.slice(0, 4)}/${d.slice(4)}`;
  return d;
};
const fmtPhone = (v) => {
  const d = digits(v).slice(0, 11);
  if (d.length > 7) return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
};

const validExpiry = (v) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  const end = new Date(2000 + Number(m[2]), month, 1); // 그 달의 다음 달 1일
  return end > new Date();
};
const validBirth = (v) => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) && d < new Date() && Number(m[1]) > 1900;
};

// 비어 있거나 모양이 틀린 칸 (key 목록)
const getErrors = (f) => {
  const e = [];
  const len = digits(f.cardNumber).length;
  if (len < 15 || len > 16) e.push("cardNumber");
  if (!validExpiry(f.expiry)) e.push("expiry");
  if (digits(f.cardPw).length !== 2) e.push("cardPw");
  if (!f.lastName.trim()) e.push("lastName");
  if (!f.firstName.trim()) e.push("firstName");
  if (!f.road.trim()) e.push("road");
  if (!f.sido) e.push("sido");
  if (!f.sigungu) e.push("sigungu");
  if (digits(f.postal).length !== 5) e.push("postal");
  if (!f.idName.trim()) e.push("idName");
  if (!validBirth(f.birth)) e.push("birth");
  if (!f.carrier) e.push("carrier");
  if (!/^01\d{8,9}$/.test(digits(f.phone))) e.push("phone");
  if (!f.nationality) e.push("nationality");
  if (!f.gender) e.push("gender");
  if (!TERMS.every((t) => f.terms[t.key])) e.push("terms");
  return e;
};

const makeId = () => `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// =====================================================================
// 화면 조각
// =====================================================================
// 위 "‹" 뒤로 · "×" 닫기 (닫기 X 는 로그인 · 구독 카드에서 쓰던 아이콘)
const SubNav = ({ onBack, onClose }) => (
  <div className="sub-pop-nav">
    <button type="button" className="sub-pop-nav-btn sub-pop-back" onClick={onBack} aria-label="뒤로">
      <span className="sub-pop-back-icon" aria-hidden="true" />
    </button>
    <button type="button" className="sub-pop-nav-btn sub-pop-close" onClick={onClose} aria-label="닫기">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
);

// 로고 + 제목 + 설명
const SubHead = ({ title, desc }) => (
  <div className="sub-pop-head">
    <img className="sub-pop-logo" src="/icons/login-logo.svg" alt="Apple TV" />
    <h1 className="sub-pop-title">{title}</h1>
    {desc && <p className="sub-pop-desc">{desc}</p>}
  </div>
);

// 라벨이 위에 붙은 입력 칸 (select 면 오른쪽 "⌄")
const Field = ({ label, invalid, select, children }) => (
  <label className={`sub-field${select ? " sub-field--select" : ""}${invalid ? " is-invalid" : ""}`}>
    <span className="sub-field-label">{label}</span>
    {children}
  </label>
);

const Select = ({ value, onChange, placeholder, options, disabled }) => (
  <select className="sub-field-input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Check = ({ checked, onChange, strong, children }) => (
  <label className={`sub-check${strong ? " sub-check--all" : ""}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{children}</span>
  </label>
);

// =====================================================================
const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = AUTH_PATHS.includes(location.state?.from) ? "/" : location.state?.from || "/";

  const { user, authReady, onStartTrial, onSavePayments, onSaveBilling } = useAuthStore();

  // step: "plans" | "payment" | "confirm" | "done" | "fail"
  const [step, setStep] = useState("plans");
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tried, setTried] = useState(false); // 확인 코드 보내기를 한 번 눌렀는지 (그 뒤부터 틀린 칸 표시)
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const enteredChecked = useRef(false);
  const formRef = useRef(null);

  // 처음 들어왔을 때 1번만: 로그인 전 → 로그인 / 이미 구독 중 → 원래 화면
  useEffect(() => {
    if (!authReady || enteredChecked.current) return;
    enteredChecked.current = true;
    if (!user) navigate("/login", { replace: true, state: { from } });
    else if (isSubscribed(user)) navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  // 단계가 바뀌면 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // 세션 확인 전 / 바로 이동할 계정은 빈 화면
  if (!authReady || !user || (isSubscribed(user) && step !== "done")) {
    return <main className="sub-pop" />;
  }

  const p = PLANS[plan];
  const trial = !user.trialUsed && !user.subscription; // 처음 구독하는 계정만 무료 체험
  const today = startOfToday();
  const trialEnd = addDays(today, TRIAL_DAYS - 1);
  const billStart = trial ? addDays(today, TRIAL_DAYS) : today;
  const payments = getPayments(user);

  const close = () => navigate(from, { replace: true });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const errors = tried ? getErrors(form) : [];
  const bad = (key) => errors.includes(key);

  // 플랜 → (지불 방법이 없으면) 지불 방법 등록 → 구독 확인
  const nextFromPlans = () => {
    setError("");
    if (payments.length > 0) {
      setStep("confirm");
    } else {
      setStep("payment");
    }
  };

  // 확인 코드 보내기 → (보낸 뒤) 확인
  const submitPayment = async () => {
    if (busy) return;
    setError("");
    const errs = getErrors(form);
    if (errs.length) {
      setTried(true);
      setError("입력하지 않았거나 형식이 맞지 않는 항목을 확인해 주세요.");
      // 첫 번째로 틀린 칸으로 이동
      requestAnimationFrame(() => {
        formRef.current?.querySelector(".sub-field.is-invalid input, .sub-field.is-invalid select, .sub-checks.is-invalid input")?.focus();
      });
      return;
    }
    if (!codeSent) {
      setCodeSent(true);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("휴대폰으로 받은 6자리 확인 코드를 입력해 주세요.");
      return;
    }

    setBusy(true);
    // 카드: 종류 + 마지막 4자리만 · 청구 주소: 이름 · 주소 · 우편번호만
    const card = { id: makeId(), brand: "신용/체크카드", last4: digits(form.cardNumber).slice(-4) };
    const okPay = await onSavePayments([...payments, card].slice(0, PAYMENT_MAX));
    const okBill = okPay && (await onSaveBilling({
      name: `${form.lastName.trim()}${form.firstName.trim()}`,
      address1: `${form.sido} ${form.sigungu} ${form.road.trim()}`,
      address2: form.detail.trim(),
      postal: digits(form.postal),
      phone: "",
    }));
    setBusy(false);
    if (!okPay || !okBill) {
      setError("지불 방법을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // 입력한 카드 · 신원 정보는 화면에서도 바로 지움
    setForm(EMPTY_FORM);
    setCode("");
    setCodeSent(false);
    setTried(false);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    const data = await onStartTrial(plan);
    setBusy(false);
    setStep(data ? "done" : "fail");
  };

  let content = null;

  // ---------- 1. Apple TV 구독하기 ----------
  if (step === "plans") {
    content = (
      <>
        <SubNav onBack={close} onClose={close} />
        <div className="sub-pop-inner sub-pop-inner--plans">
          <SubHead title="Apple TV 구독하기" desc="Apple TV를 구독하고 오리지널 컨텐츠를 즐겨보세요." />

          <div className="sub-plans" role="radiogroup" aria-label="플랜 선택">
            {Object.entries(PLANS).map(([key, item]) => (
              <label key={key} className={`sub-plan${plan === key ? " is-on" : ""}`}>
                <input type="radio" name="plan" value={key} checked={plan === key} onChange={() => setPlan(key)} />
                <strong className="sub-plan-name">{item.name}</strong>
                <span className="sub-plan-price">{trial ? item.trialPrice : item.price}</span>
              </label>
            ))}
          </div>

          <h2 className="sub-benefit-title">포함 혜택</h2>
          <ul className="sub-benefits">
            {BENEFITS.map((b) => <li key={b}>{b}</li>)}
          </ul>

          <p className="sub-fineprint">타사 OTT 구독·대여·구입 콘텐츠와 Apple TV 4K 기기 구매는 포함되지 않습니다.</p>

          <button type="button" className="sub-btn" onClick={nextFromPlans}>
            {trial ? "무료 체험 계속" : "계속"}
          </button>
        </div>
      </>
    );
  }

  // ---------- 2. 지불 방법 등록 ----------
  if (step === "payment") {
    const sigunguList = KOREA_REGIONS[form.sido] || [];
    const allTerms = TERMS.every((t) => form.terms[t.key]);
    const setTerm = (key) => (v) => setForm((f) => ({ ...f, terms: { ...f.terms, [key]: v } }));
    const setAllTerms = (v) => setForm((f) => ({ ...f, terms: Object.fromEntries(TERMS.map((t) => [t.key, v])) }));

    content = (
      <>
        <SubNav onBack={() => { setError(""); setStep("plans"); }} onClose={close} />
        <div className="sub-pay-layout">
          <form
            ref={formRef}
            className="sub-pop-inner sub-pop-inner--form"
            onSubmit={(e) => { e.preventDefault(); submitPayment(); }}
            noValidate
          >
            <SubHead title="지불 방법 등록" desc="결제에 사용할 결제수단을 등록해 주세요." />

            <section className="sub-section">
              <h2 className="sub-section-title">지불 유형</h2>
              <Field label="결제수단" select>
                <Select value={form.method} onChange={set("method")} options={PAY_METHODS} />
              </Field>
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">카드 세부사항</h2>
              <Field label="카드번호" invalid={bad("cardNumber")}>
                <input className="sub-field-input" inputMode="numeric" autoComplete="cc-number" placeholder="0000  0000  0000  0000"
                  value={form.cardNumber} onChange={(e) => set("cardNumber")(fmtCard(e.target.value))} />
              </Field>
              <div className="sub-row">
                <Field label="유효기간" invalid={bad("expiry")}>
                  <input className="sub-field-input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY"
                    value={form.expiry} onChange={(e) => set("expiry")(fmtExpiry(e.target.value))} />
                </Field>
                <Field label="비밀번호" invalid={bad("cardPw")}>
                  <input className="sub-field-input" type="password" inputMode="numeric" autoComplete="off" placeholder="앞 2자리"
                    value={form.cardPw} onChange={(e) => set("cardPw")(digits(e.target.value).slice(0, 2))} />
                </Field>
              </div>
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">청구 주소</h2>
              <div className="sub-row">
                <Field label="성" invalid={bad("lastName")}>
                  <input className="sub-field-input" autoComplete="family-name" placeholder="성" maxLength={20}
                    value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
                </Field>
                <Field label="이름" invalid={bad("firstName")}>
                  <input className="sub-field-input" autoComplete="given-name" placeholder="이름" maxLength={30}
                    value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
                </Field>
              </div>
              <Field label="도로명 주소" invalid={bad("road")}>
                <input className="sub-field-input" autoComplete="address-line1" placeholder="도로명과 건물번호" maxLength={100}
                  value={form.road} onChange={(e) => set("road")(e.target.value)} />
              </Field>
              <Field label="상세 주소">
                <input className="sub-field-input" autoComplete="address-line2" placeholder="동·호수 등 (선택)" maxLength={100}
                  value={form.detail} onChange={(e) => set("detail")(e.target.value)} />
              </Field>
              <div className="sub-row">
                <Field label="시/도" select invalid={bad("sido")}>
                  <Select value={form.sido} placeholder="시/도 선택" options={SIDO_LIST}
                    onChange={(v) => setForm((f) => ({ ...f, sido: v, sigungu: "" }))} />
                </Field>
                <Field label="시/군/구" select invalid={bad("sigungu")}>
                  <Select value={form.sigungu} placeholder="시/군/구 선택" options={sigunguList}
                    onChange={set("sigungu")} disabled={!form.sido} />
                </Field>
              </div>
              <Field label="우편번호" invalid={bad("postal")}>
                <input className="sub-field-input" inputMode="numeric" autoComplete="postal-code" placeholder="우편번호 입력"
                  value={form.postal} onChange={(e) => set("postal")(digits(e.target.value).slice(0, 5))} />
              </Field>
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">신원 확인</h2>
              <p className="sub-section-desc">결제수단 등록을 위해 본인 확인이 필요합니다. 이동통신사에 등록된 정보와 동일하게 입력해 주세요.</p>
              <a className="sub-small-link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">본인 확인에 대해 알아보기</a>
              <Field label="이름" invalid={bad("idName")}>
                <input className="sub-field-input" autoComplete="name" placeholder="이동통신사에 등록된 이름" maxLength={30}
                  value={form.idName} onChange={(e) => set("idName")(e.target.value)} />
              </Field>
              <Field label="생년월일" invalid={bad("birth")}>
                <input className="sub-field-input" inputMode="numeric" autoComplete="bday" placeholder="YYYY/MM/DD"
                  value={form.birth} onChange={(e) => set("birth")(fmtBirth(e.target.value))} />
              </Field>
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">이동통신사 정보</h2>
              <Field label="이동통신사" select invalid={bad("carrier")}>
                <Select value={form.carrier} placeholder="이동통신사 선택" options={CARRIERS} onChange={set("carrier")} />
              </Field>
              <Field label="휴대폰 번호" invalid={bad("phone")}>
                <input className="sub-field-input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000"
                  value={form.phone} onChange={(e) => set("phone")(fmtPhone(e.target.value))} />
              </Field>
              <div className="sub-row">
                <Field label="국적" select invalid={bad("nationality")}>
                  <Select value={form.nationality} placeholder="국적 선택" options={NATIONALITIES} onChange={set("nationality")} />
                </Field>
                <Field label="성별" select invalid={bad("gender")}>
                  <Select value={form.gender} placeholder="성별 선택" options={GENDERS} onChange={set("gender")} />
                </Field>
              </div>
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">개인정보 보호 및 이용약관</h2>
              <p className="sub-section-desc">입력한 내용을 확인하고 필수 약관에 동의해 주세요.</p>
              <div className={`sub-checks${bad("terms") ? " is-invalid" : ""}`}>
                <Check checked={allTerms} onChange={setAllTerms} strong>필수 약관에 모두 동의합니다.</Check>
                {TERMS.map((t) => (
                  <Check key={t.key} checked={form.terms[t.key]} onChange={setTerm(t.key)}>{t.label}</Check>
                ))}
              </div>
              <a className="sub-small-link" href={TERMS_URL} target="_blank" rel="noopener noreferrer">약관 상세 보기</a>
            </section>

            <p className="sub-note">아래 &apos;확인 코드 보내기&apos;를 누르면 입력한 휴대폰으로 본인 확인 코드가 전송됩니다.</p>

            {codeSent && (
              <section className="sub-section sub-section--code">
                <Field label="확인 코드">
                  <input className="sub-field-input" inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 숫자"
                    value={code} onChange={(e) => setCode(digits(e.target.value).slice(0, 6))} autoFocus />
                </Field>
                <p className="sub-note">입력한 휴대폰 번호로 확인 코드를 보냈어요. (데모 화면: 6자리 숫자를 입력하면 확인됩니다)</p>
              </section>
            )}

            {error && <p className="sub-error" role="alert">{error}</p>}

            {/* 휴대폰: 폼 맨 아래 버튼 */}
            <button type="submit" className="sub-btn sub-btn--form" disabled={busy}>
              {busy ? "등록 중..." : codeSent ? "확인" : "확인 코드 보내기"}
            </button>
          </form>

          {/* PC · 태블릿: 오른쪽에 떠 있는 버튼 (스크롤해도 화면 가운데) */}
          <aside className="sub-pay-aside">
            <button type="button" className="sub-btn sub-btn--aside" onClick={submitPayment} disabled={busy}>
              {busy ? "등록 중..." : codeSent ? "확인" : "확인 코드 보내기"}
            </button>
          </aside>
        </div>
      </>
    );
  }

  // ---------- 3. 구독 확인 ----------
  if (step === "confirm") {
    content = (
      <div className="sub-pop-inner sub-pop-inner--narrow sub-pop-center">
        <h1 className="sub-confirm-title">구독 확인</h1>

        <div className="sub-confirm-card">
          <div className="sub-confirm-app">
            <img className="sub-confirm-logo" src="/icons/login-logo.svg" alt="" aria-hidden="true" />
            <div className="sub-confirm-app-text">
              <strong className="sub-confirm-app-name">Apple TV</strong>
              <span className="sub-confirm-plan">{p.name}</span>
              <span className="sub-confirm-share">가족 공유 가능</span>
            </div>
          </div>

          <div className="sub-confirm-terms">
            {trial && (
              <div className="sub-confirm-row">
                <strong className="sub-confirm-label">1주 무료 체험</strong>
                <span className="sub-confirm-date">{fmtKo(today)}부터</span>
              </div>
            )}
            <div className="sub-confirm-row">
              <strong className="sub-confirm-price">{p.price}</strong>
              <span className="sub-confirm-date">{fmtKo(billStart)}부터</span>
            </div>
          </div>

          <p className="sub-confirm-fine">
            {trial && <>무료 체험은 대상 계정에 한해 제공됩니다.<br /></>}
            {trial
              ? `무료 체험 종료 후에는 취소할 때까지 ${p.renew}으로 자동 갱신됩니다.`
              : `취소할 때까지 ${p.renew}으로 자동 갱신됩니다.`}
            <br />
            계정 설정에서 구독을 관리할 수 있습니다.
          </p>
        </div>

        <button type="button" className="sub-btn" onClick={handleConfirm} disabled={busy}>
          {busy ? "처리 중..." : "확인"}
        </button>
      </div>
    );
  }

  // ---------- 4. 구독 완료 ----------
  if (step === "done") {
    const sub = user.subscription;
    const start = sub?.startedAt?.toMillis ? new Date(sub.startedAt.toMillis()) : today;
    const end = sub?.expiresAt?.toMillis ? addDays(new Date(sub.expiresAt.toMillis()), -1) : trialEnd;
    const isTrial = sub?.status === "trial";
    content = (
      <div className="sub-pop-inner sub-pop-inner--narrow sub-pop-center sub-done">
        <span className="sub-done-check" aria-hidden="true" />
        <h1 className="sub-done-title">구독이 완료되었어요</h1>
        <p className="sub-done-desc">Apple TV를 바로 즐겨보세요.</p>

        <div className="sub-done-box">
          <strong className="sub-done-plan">{PLANS[sub?.plan]?.name || p.name}</strong>
          <span className="sub-done-period">
            {isTrial ? `무료 체험 기간: ${fmtDot(start)} – ${fmtDot(end)}` : `이용 기간: ${fmtDot(start)} – ${fmtDot(end)}`}
          </span>
        </div>

        <button type="button" className="sub-btn" onClick={() => navigate("/", { replace: true })}>
          홈으로 돌아가기
        </button>
        <p className="sub-done-note">홈에서 원하는 콘텐츠를 선택하고 시청하세요.</p>
      </div>
    );
  }

  // ---------- 실패 ----------
  if (step === "fail") {
    content = (
      <div className="sub-pop-inner sub-pop-inner--narrow sub-pop-center sub-done">
        <h1 className="sub-done-title">구독을 완료하지 못했어요</h1>
        <p className="sub-done-desc">연결 상태를 확인한 후 다시 시도해 주세요.</p>
        <button type="button" className="sub-btn" onClick={() => setStep("confirm")}>
          다시 시도
        </button>
        <button type="button" className="sub-text-btn" onClick={() => setStep("plans")}>
          플랜으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <main className={`sub-pop sub-pop--${step} page-fade`} key={step}>
      {content}
    </main>
  );
};

export default Subscribe;
