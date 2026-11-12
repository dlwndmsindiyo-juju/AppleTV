// src/pages/Subscribe.jsx
// [수정] 구독 팝업 (시안: Apple TV 구독하기 → 지불 방법 등록 → 구독 확인 → 구독 완료)
// - [수정] 팝업: 지금 보고 있는 화면 위에 어두운 배경 + 가운데 창
//   · 로그인 → 프로필을 누르면 그 화면(프로필 선택) 위에 바로 뜸 (Login.jsx 에서 <SubscribePopup />)
//   · /subscribe 로 들어오면 보던 화면(from) 위에 뜸 (App.jsx 가 뒤에 원래 화면을 그림)
//   · Esc · 배경 누르면 닫힘 (지불 방법 입력 중에는 배경 눌러도 안 닫힘 · 구독 완료 화면은 홈으로)
// - [추가] 지불 방법 등록 화면은 계정 설정 [지불 방법 추가] 에서도 같은 팝업으로 씀 (<PaymentRegisterPopup />)
// - 위 왼쪽 "‹" 뒤로 · 오른쪽 "×" 닫기: 플랜 선택 · 지불 방법 등록 화면에만 (시안)
// - 로고: public/icons/login-logo.svg (로그인 화면과 같은 로고)
// - 등록된 지불 방법이 이미 있으면 지불 방법 등록은 건너뜀
// - 저장: 카드는 카드 종류 + 마지막 4자리만 · 청구 주소는 입력한 이름 · 주소 · 우편번호만
//   (카드번호 전체 · 유효기간 · 비밀번호 · 신원 확인 · 통신사 정보는 저장하지 않음)
// - 로그인 전이면 로그인으로, 이미 구독 중인 계정이 들어오면 화면 없이 원래 화면으로 이동
// - 스타일: App.scss "구독 팝업" (.sub-pop-*) · 휴대폰 mobile.scss
import { resumePath } from "../utils/resumeIntent"; // [추가] 구독 후 하던 화면으로
import { openPostcode } from "../utils/daumPostcode"; // [추가] 도로명 주소 검색 팝업
import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react"; // [수정] useMemo: 생년월일 데이트 피커
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom"; // [수정] Link: 안내 페이지
import { useAuthStore, isSubscribed, getPayments, PAYMENT_MAX } from "../store/useAuthStore";
import { KOREA_REGIONS, SIDO_LIST } from "../data/koreaRegions";
import { IDENTITY_URL, TERMS_URL } from "../data/appleLinks"; // [수정] 사이트 안 안내 페이지
import { CARD_BRANDS } from "../components/profile/AccountShared"; // [추가] 카드사 (계정 설정 지불 방법에 카드사 로고로 보임)

const AUTH_PATHS = ["/login", "/subscribe"];
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
  brand: "", // [추가] 카드사
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

// [추가] 청구 주소 칸 검사 (지불 방법 등록 · 청구 주소 팝업 공용)
const getAddressErrors = (f) => {
  const e = [];
  if (!f.lastName.trim()) e.push("lastName");
  if (!f.firstName.trim()) e.push("firstName");
  if (!f.road.trim()) e.push("road");
  if (!f.sido) e.push("sido");
  if (!f.sigungu) e.push("sigungu");
  if (digits(f.postal).length !== 5) e.push("postal");
  return e;
};

// [추가] 저장 모양 (users/{uid}.billing: name · address1 · address2 · postal · phone)
const toBilling = (f, phone = "") => ({
  name: `${f.lastName.trim()}${f.firstName.trim()}`,
  address1: `${f.sido} ${f.sigungu} ${f.road.trim()}`,
  address2: f.detail.trim(),
  postal: digits(f.postal),
  phone,
});

// [추가] 저장된 청구 주소 → 입력 칸 (편집할 때 채워 넣기 · 이름은 첫 글자를 성으로)
const fromBilling = (b) => {
  if (!b) return {};
  const name = (b.name || "").trim();
  let rest = (b.address1 || "").trim();
  const sido = SIDO_LIST.find((x) => rest.startsWith(`${x} `)) || "";
  if (sido) rest = rest.slice(sido.length + 1);
  const sigungu = sido ? (KOREA_REGIONS[sido].find((x) => rest.startsWith(`${x} `)) || "") : "";
  if (sigungu) rest = rest.slice(sigungu.length + 1);
  return {
    lastName: name.slice(0, 1),
    firstName: name.slice(1),
    road: rest,
    detail: b.address2 || "",
    sido,
    sigungu,
    postal: b.postal || "",
    phone: b.phone ? fmtPhone(b.phone) : "",
  };
};

// 비어 있거나 모양이 틀린 칸 (key 목록)
// [추가] 카드 칸만 (계정 설정 지불 방법 추가)
const getCardErrors = (f) => {
  const e = [];
  if (!f.brand) e.push("brand");
  const len = digits(f.cardNumber).length;
  if (len < 15 || len > 16) e.push("cardNumber");
  if (!validExpiry(f.expiry)) e.push("expiry");
  if (digits(f.cardPw).length !== 2) e.push("cardPw");
  return e;
};

const getErrors = (f) => {
  const e = getCardErrors(f);
  e.push(...getAddressErrors(f));
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

// 라벨이 위에 붙은 입력 칸
const Field = ({ label, invalid, children }) => (
  <label className={`sub-field${invalid ? " is-invalid" : ""}`}>
    <span className="sub-field-label">{label}</span>
    {children}
  </label>
);

// [수정] 선택 칸: 기본 select 대신 펼쳐지는 목록 (시안: 칸 아래로 목록이 붙어서 열림 · 고른 항목 ✓ · 마우스를 올린 항목 프라이머리)
// - 키보드: Enter · Space · ↓ 로 열기, ↑ ↓ 로 이동, Esc 로 닫기 (팝업은 안 닫힘)
const Dropdown = ({ label, value, onChange, placeholder, options, disabled, invalid }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    // 열리면 고른 항목(없으면 첫 항목)으로 포커스
    const items = listRef.current?.querySelectorAll(".sub-select-option");
    const idx = Math.max(0, options.indexOf(value));
    items?.[idx]?.focus({ preventScroll: false });
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (o) => {
    onChange(o);
    setOpen(false);
    boxRef.current?.querySelector(".sub-select-trigger")?.focus();
  };

  const onListKey = (e) => {
    const items = [...(listRef.current?.querySelectorAll(".sub-select-option") || [])];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // 팝업 Esc 닫기로 넘어가지 않게
      setOpen(false);
      boxRef.current?.querySelector(".sub-select-trigger")?.focus();
    }
    if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={boxRef} className={`sub-select${open ? " is-open" : ""}${invalid ? " is-invalid" : ""}${disabled ? " is-disabled" : ""}`}>
      <button
        type="button"
        className="sub-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); }
          if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }}
      >
        <span className="sub-field-label">{label}</span>
        <span className={`sub-select-value${value ? "" : " is-placeholder"}`}>{value || placeholder}</span>
      </button>
      {open && (
        <ul ref={listRef} id={listId} className="sub-select-list" role="listbox" aria-label={label} onKeyDown={onListKey}>
          {options.map((o) => (
            <li key={o} role="presentation">
              <button type="button" role="option" aria-selected={o === value} className="sub-select-option" onClick={() => pick(o)}>
                <span>{o}</span>
                {o === value && <span className="sub-select-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// [추가] 생년월일 데이트 피커 (신원 확인) — 칸 모양은 선택 칸(Dropdown)과 같음 · 아래로 달력이 붙어서 펼쳐짐
// - 값: "YYYY/MM/DD" (기존 검사 validBirth 그대로)
// - 달력 위: 연도 · 월 선택 (생년월일이라 연도를 빨리 고를 수 있게) + 이전 · 다음 달
// - 오늘 이후 날짜는 고를 수 없음 · 바깥 누르기 / Esc 로 닫기
// - 키보드: 방향키로 날짜 이동 · Enter / Space 로 고르기 · PageUp / PageDown 으로 달 이동
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const toBirth = (d) => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
const fromBirth = (v) => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(v || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const BirthDatePicker = ({ label, value, onChange, invalid }) => {
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const minYear = 1900;
  const selected = fromBirth(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date(2000, 0, 1)); // 보고 있는 달 (1일 기준 아님 · 포커스 날짜)
  const boxRef = useRef(null);
  const gridRef = useRef(null);
  const popId = useId();

  const year = view.getFullYear();
  const month = view.getMonth();
  const clamp = (d) => (d > today ? today : d.getFullYear() < minYear ? new Date(minYear, 0, 1) : d);

  // 열 때: 고른 날(없으면 2000년 1월 1일)부터
  const toggle = () => {
    if (!open) setView(selected || new Date(2000, 0, 1));
    setOpen((v) => !v);
  };

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 포커스 날짜가 바뀌면 그 날짜 버튼으로 포커스 (달력 안에서 움직일 때만)
  const keyNavRef = useRef(false);
  useEffect(() => {
    if (!open || !keyNavRef.current) return;
    keyNavRef.current = false;
    gridRef.current?.querySelector(`[data-day="${view.getDate()}"]`)?.focus();
  }, [open, view]);

  const pick = (d) => {
    if (d > today) return;
    onChange(toBirth(d));
    setOpen(false);
    boxRef.current?.querySelector(".sub-select-trigger")?.focus();
  };

  const moveDays = (n) => {
    keyNavRef.current = true;
    setView((v) => clamp(new Date(v.getFullYear(), v.getMonth(), v.getDate() + n)));
  };
  const moveMonths = (n) => {
    setView((v) => {
      const last = new Date(v.getFullYear(), v.getMonth() + n + 1, 0).getDate();
      return clamp(new Date(v.getFullYear(), v.getMonth() + n, Math.min(v.getDate(), last)));
    });
  };
  const setYM = (y, m) => {
    const last = new Date(y, m + 1, 0).getDate();
    setView(clamp(new Date(y, m, Math.min(view.getDate(), last))));
  };

  const onGridKey = (e) => {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key]) { e.preventDefault(); moveDays(map[e.key]); }
    if (e.key === "PageUp") { e.preventDefault(); keyNavRef.current = true; moveMonths(-1); }
    if (e.key === "PageDown") { e.preventDefault(); keyNavRef.current = true; moveMonths(1); }
  };
  const onPopKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // 팝업 Esc 닫기로 넘어가지 않게
      setOpen(false);
      boxRef.current?.querySelector(".sub-select-trigger")?.focus();
    }
  };

  // 달력 칸: 앞쪽 빈칸 + 1일 ~ 말일
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: lastDate }, (_, i) => i + 1)];
  const years = Array.from({ length: today.getFullYear() - minYear + 1 }, (_, i) => today.getFullYear() - i);
  const canPrev = !(year === minYear && month === 0);
  const canNext = !(year === today.getFullYear() && month === today.getMonth());

  return (
    <div ref={boxRef} className={`sub-select sub-date${open ? " is-open" : ""}${invalid ? " is-invalid" : ""}`}>
      <button
        type="button"
        className="sub-select-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); toggle(); }
          if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }}
      >
        <span className="sub-field-label">{label}</span>
        <span className={`sub-select-value${value ? "" : " is-placeholder"}`}>{value || "YYYY/MM/DD"}</span>
      </button>

      {open && (
        <div id={popId} className="sub-date-pop" role="dialog" aria-label={`${label} 선택`} onKeyDown={onPopKey}>
          <div className="sub-date-head">
            <button type="button" className="sub-date-nav is-prev" onClick={() => moveMonths(-1)} disabled={!canPrev} aria-label="이전 달" />
            <div className="sub-date-ym">
              <select className="sub-date-select" value={year} onChange={(e) => setYM(Number(e.target.value), month)} aria-label="연도">
                {years.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select className="sub-date-select" value={month} onChange={(e) => setYM(year, Number(e.target.value))} aria-label="월">
                {Array.from({ length: 12 }, (_, m) => (
                  <option key={m} value={m} disabled={year === today.getFullYear() && m > today.getMonth()}>{m + 1}월</option>
                ))}
              </select>
            </div>
            <button type="button" className="sub-date-nav is-next" onClick={() => moveMonths(1)} disabled={!canNext} aria-label="다음 달" />
          </div>

          <div className="sub-date-week" aria-hidden="true">
            {WEEK.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div ref={gridRef} className="sub-date-grid" role="grid" onKeyDown={onGridKey}>
            {cells.map((day, i) => {
              if (!day) return <span key={`e${i}`} className="sub-date-empty" />;
              const d = new Date(year, month, day);
              const isSel = sameDay(d, selected);
              const isFocus = day === view.getDate();
              return (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  className={`sub-date-day${isSel ? " is-selected" : ""}${sameDay(d, today) ? " is-today" : ""}`}
                  disabled={d > today}
                  tabIndex={isFocus ? 0 : -1}
                  aria-selected={isSel}
                  aria-label={`${year}년 ${month + 1}월 ${day}일`}
                  onClick={() => pick(d)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Check = ({ checked, onChange, strong, children }) => (
  <label className={`sub-check${strong ? " sub-check--all" : ""}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{children}</span>
  </label>
);

// 청구 주소 검색: 기존 form.road / sido / sigungu / postal 상태를 그대로 사용
const BillingSection = ({ form, setForm, bad, children }) => {
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  // [추가] 도로명 주소 검색 팝업
  const [addressError, setAddressError] = useState("");
  const searchAddress = async () => {
    setAddressError("");
    try {
      const picked = await openPostcode();
      if (!picked) return; // 그냥 닫음
      setForm((f) => ({
        ...f,
        road: picked.road,
        sido: picked.sido || f.sido,
        sigungu: picked.sido ? picked.sigungu : f.sigungu,
        postal: picked.postal,
      }));
    } catch {
      setAddressError("주소 검색을 열지 못했어요. 직접 입력하거나 잠시 후 다시 시도해 주세요.");
    }
  };
  const sigunguList = KOREA_REGIONS[form.sido] || [];

  const handleAddressComplete = (data) => {
    const fullAddress = data.roadAddress || data.address || "";
    const apiSido = data.sido || "";
    const apiSigungu = data.sigungu || "";

    // 검색 API의 시/도 표기(예: '서울')를 프로젝트 선택지(예: '서울특별시')로 변환
    const sidoAliases = {
      서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시",
      인천: "인천광역시", 광주: "광주광역시", 대전: "대전광역시",
      울산: "울산광역시", 세종: "세종특별자치시", 경기: "경기도",
      강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
      전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도",
      경남: "경상남도", 제주: "제주특별자치도",
    };
    const mappedSido = sidoAliases[apiSido] || apiSido;
    const sido = SIDO_LIST.find((name) => name === mappedSido || name === apiSido)
      || SIDO_LIST.find((name) => name.startsWith(apiSido) && apiSido)
      || mappedSido;

    // 전체 도로명주소에서 시/도 및 시/군/구를 빼고 저장 (toBilling에서 다시 합침)
    let road = fullAddress;
    for (const prefix of [apiSido, apiSigungu]) {
      if (prefix && road.startsWith(`${prefix} `)) road = road.slice(prefix.length).trimStart();
    }

    setForm((prev) => ({
      ...prev,
      road,
      sido,
      sigungu: apiSigungu,
      postal: data.zonecode || "",
      detail: "",
    }));
    setPostcodeOpen(false);
  };

  return (
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
      {/* [추가] 도로명 주소 검색 (Daum 우편번호) — 고르면 도로명 · 시/도 · 시/군/구 · 우편번호를 한 번에 채움 */}
      <div className="sub-address-search">
        <Field label="도로명 주소" invalid={bad("road")}>
          <input className="sub-field-input" autoComplete="address-line1" placeholder="도로명과 건물번호" maxLength={100}
            value={form.road} onChange={(e) => set("road")(e.target.value)} />
        </Field>
        <button type="button" className="sub-address-btn" onClick={searchAddress}>
          주소 검색
        </button>
      </div>
      {addressError && <p className="sub-address-error" role="alert">{addressError}</p>}
      <Field label="상세 주소">
        <input className="sub-field-input" autoComplete="address-line2" placeholder="동·호수 등 (선택)" maxLength={100}
          value={form.detail} onChange={(e) => set("detail")(e.target.value)} />
      </Field>
      <div className="sub-row">
        <Dropdown label="시/도" invalid={bad("sido")} value={form.sido} placeholder="시/도 선택" options={SIDO_LIST}
          onChange={(v) => setForm((f) => ({ ...f, sido: v, sigungu: "" }))} />
        <Dropdown label="시/군/구" invalid={bad("sigungu")} value={form.sigungu} placeholder="시/군/구 선택"
          options={sigunguList} onChange={set("sigungu")} disabled={!form.sido} />
      </div>
      <Field label="우편번호" invalid={bad("postal")}>
        <input className="sub-field-input" autoComplete="postal-code" placeholder="주소 검색 시 자동 입력"
          value={form.postal} readOnly onClick={() => setPostcodeOpen(true)} />
      </Field>
      {children}
    </section>
  );
};

// =====================================================================
// [추가] 팝업 틀: 어두운 배경 + 가운데 창 (뒤 화면 스크롤 막기 · Esc 로 닫기)
// =====================================================================
// [추가] 팝업 아래 고정 띠 자리 (지불 방법 등록의 [확인 코드 보내기]) — 스크롤 영역 밖이라 스크롤바가 띠 위에서 끝남
const FooterSlot = createContext(null);

const SubModal = ({ step, onDismiss, dismissOnBackdrop = true, busy = false, children }) => {
  const dialogRef = useRef(null); // 스크롤 영역
  const [footerEl, setFooterEl] = useState(null);
  const latest = useRef(onDismiss);
  latest.current = onDismiss;

  // 단계가 바뀌면 팝업 안을 맨 위로
  useEffect(() => {
    if (dialogRef.current) dialogRef.current.scrollTop = 0;
  }, [step]);

  // 떠 있는 동안 뒤 화면 스크롤 막기 · Esc 로 닫기
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && latest.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const onBackdrop = (e) => {
    if (e.target !== e.currentTarget || busy || !dismissOnBackdrop) return;
    onDismiss();
  };

  return createPortal(
    <div className="sub-pop-backdrop" onMouseDown={onBackdrop}>
      <div className={`sub-pop sub-pop--${step}`} role="dialog" aria-modal="true" aria-label="Apple TV 구독">
        {/* [수정] 스크롤은 창 안쪽 영역에서만 (스크롤바가 창 가장자리 · 둥근 모서리에서 떨어져 있음) */}
        <div ref={dialogRef} className="sub-pop-scroll">
          <div className="sub-pop-body page-fade" key={step}>
            <FooterSlot.Provider value={footerEl}>{children}</FooterSlot.Provider>
          </div>
        </div>
        <div ref={setFooterEl} className="sub-pop-foot" />
      </div>
    </div>,
    document.body
  );
};

// =====================================================================
// [추가] 지불 방법 등록 (구독 팝업 2단계 · 계정 설정 [지불 방법 추가] 공용)
// - 저장: 카드 종류 + 마지막 4자리 · 청구 주소(이름 · 주소 · 우편번호)만 → onSaved()
// - [추가] cardOnly: 계정 설정 [지불 방법 추가] — 지불 유형 · 카드 세부사항만 (주소 · 신원 · 통신사 · 전화번호 · 약관 · 확인 코드 없음)
// =====================================================================
const PaymentForm = ({ onBack, onClose, onSaved, onBusyChange, cardOnly = false }) => {
  const footerEl = useContext(FooterSlot);
  const user = useAuthStore((s) => s.user);
  const onSavePayments = useAuthStore((s) => s.onSavePayments);
  const onSaveBirthDate = useAuthStore((s) => s.onSaveBirthDate); // [추가] 신원 확인 생년월일 → 미성년자 판단
  const onSaveBilling = useAuthStore((s) => s.onSaveBilling);

  const [form, setForm] = useState(EMPTY_FORM);
  const [tried, setTried] = useState(false); // 확인 코드 보내기를 한 번 눌렀는지 (그 뒤부터 틀린 칸 표시)
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusyState] = useState(false);
  const formRef = useRef(null);

  const setBusy = (v) => {
    setBusyState(v);
    onBusyChange?.(v);
  };

  const payments = getPayments(user);
  const full = payments.length >= PAYMENT_MAX;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const check = cardOnly ? getCardErrors : getErrors;
  const errors = tried ? check(form) : [];
  const bad = (key) => errors.includes(key);

  const allTerms = TERMS.every((t) => form.terms[t.key]);
  const setTerm = (key) => (v) => setForm((f) => ({ ...f, terms: { ...f.terms, [key]: v } }));
  const setAllTerms = (v) => setForm((f) => ({ ...f, terms: Object.fromEntries(TERMS.map((t) => [t.key, v])) }));

  // 확인 코드 보내기 → (보낸 뒤) 확인
  const submitPayment = async () => {
    if (busy) return;
    setError("");
    if (full) {
      setError(`지불 방법은 최대 ${PAYMENT_MAX}개까지 등록할 수 있어요.`);
      return;
    }
    const errs = check(form);
    if (errs.length) {
      setTried(true);
      setError("입력하지 않았거나 형식이 맞지 않는 항목을 확인해 주세요.");
      // 첫 번째로 틀린 칸으로 이동
      requestAnimationFrame(() => {
        formRef.current?.querySelector(".sub-field.is-invalid input, .sub-select.is-invalid .sub-select-trigger, .sub-checks.is-invalid input")?.focus();
      });
      return;
    }
    // [추가] 이미 등록한 카드(같은 카드사 + 같은 마지막 4자리)는 다시 등록하지 않음
    const newLast4 = digits(form.cardNumber).slice(-4);
    if (payments.some((p) => (p.method || "card") === "card" && p.brand === form.brand && p.last4 === newLast4)) {
      setError("이미 등록된 카드입니다. 다른 카드를 입력해 주세요.");
      return;
    }
    if (!cardOnly && !codeSent) {
      setCodeSent(true);
      return;
    }
    if (!cardOnly && !/^\d{6}$/.test(code)) {
      setError("휴대폰으로 받은 6자리 확인 코드를 입력해 주세요.");
      return;
    }

    setBusy(true);
    // 카드: 종류 + 마지막 4자리만 · 청구 주소: 이름 · 주소 · 우편번호만
    const card = { id: makeId(), brand: form.brand, last4: digits(form.cardNumber).slice(-4) }; // 카드사 + 마지막 4자리만
    const okPay = await onSavePayments([...payments, card].slice(0, PAYMENT_MAX));
    const okBill = okPay && (cardOnly || (await onSaveBilling(toBilling(form)))); // 계정 설정: 카드만 저장
    if (okBill && !cardOnly) await onSaveBirthDate(form.birth); // [추가] 생년월일 저장 (미성년자면 청소년 관람불가 콘텐츠 제한)
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
    onSaved?.(card);
  };

  return (
    <>
      <SubNav onBack={onBack} onClose={onClose} />
      <div className="sub-pay-layout">
        <form
          ref={formRef}
          id="sub-pay-form"
          className="sub-pop-inner sub-pop-inner--form"
          onSubmit={(e) => { e.preventDefault(); submitPayment(); }}
          noValidate
        >
          <SubHead title="지불 방법 등록" desc="결제에 사용할 결제수단을 등록해 주세요." />

          <section className="sub-section">
            <h2 className="sub-section-title">지불 유형</h2>
            <Dropdown label="결제수단" value={form.method} onChange={set("method")} options={PAY_METHODS} />
          </section>

          <section className="sub-section">
            <h2 className="sub-section-title">카드 세부사항</h2>
            <Dropdown label="카드사" invalid={bad("brand")} value={form.brand} placeholder="카드사 선택" options={CARD_BRANDS} onChange={set("brand")} />
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

          {!cardOnly && (<>
            <BillingSection form={form} setForm={setForm} bad={bad} />

            <section className="sub-section">
              <h2 className="sub-section-title">신원 확인</h2>
              <p className="sub-section-desc">결제수단 등록을 위해 본인 확인이 필요합니다. 이동통신사에 등록된 정보와 동일하게 입력해 주세요.</p>
              <Link className="sub-small-link" to={IDENTITY_URL}>본인 확인에 대해 알아보기</Link>
              <Field label="이름" invalid={bad("idName")}>
                <input className="sub-field-input" autoComplete="name" placeholder="이동통신사에 등록된 이름" maxLength={30}
                  value={form.idName} onChange={(e) => set("idName")(e.target.value)} />
              </Field>
              {/* [수정] 생년월일: 데이트 피커 (미성년자 판단에 사용 · 구독할 때 계정에 저장) */}
              <BirthDatePicker label="생년월일" invalid={bad("birth")} value={form.birth} onChange={set("birth")} />
            </section>

            <section className="sub-section">
              <h2 className="sub-section-title">이동통신사 정보</h2>
              <Dropdown label="이동통신사" invalid={bad("carrier")} value={form.carrier} placeholder="이동통신사 선택" options={CARRIERS} onChange={set("carrier")} />
              <Field label="휴대폰 번호" invalid={bad("phone")}>
                <input className="sub-field-input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000"
                  value={form.phone} onChange={(e) => set("phone")(fmtPhone(e.target.value))} />
              </Field>
              <div className="sub-row">
                <Dropdown label="국적" invalid={bad("nationality")} value={form.nationality} placeholder="국적 선택" options={NATIONALITIES} onChange={set("nationality")} />
                <Dropdown label="성별" invalid={bad("gender")} value={form.gender} placeholder="성별 선택" options={GENDERS} onChange={set("gender")} />
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
              <Link className="sub-small-link" to={TERMS_URL}>약관 상세 보기</Link>
            </section>

            <p className="sub-note">아래 &apos;확인 코드 보내기&apos;를 누르면 입력한 휴대폰으로 본인 확인 코드가 전송됩니다.</p>

            {codeSent && (
              <section className="sub-section sub-section--code">
                <Field label="확인 코드">
                  <input className="sub-field-input" inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 숫자"
                    value={code} onChange={(e) => setCode(digits(e.target.value).slice(0, 6))} autoFocus />
                </Field>
                <p className="sub-note">가상의 확인 코드를 입력해주시면 확인으로 처리됩니다.</p>
              </section>
            )}
          </>)}

          {error && <p className="sub-error" role="alert">{error}</p>}

        </form>
      </div>

      {/* [수정] 확인 코드 버튼: 팝업 맨 아래 고정 띠 (스크롤 영역 밖 · SubModal 의 .sub-pop-foot 에 그림) */}
      {footerEl && createPortal(
        <div className="sub-pay-footer">
          <button type="submit" form="sub-pay-form" className="sub-btn" disabled={busy}>
            {busy ? "등록 중..." : cardOnly ? "등록" : codeSent ? "확인" : "확인 코드 보내기"}
          </button>
        </div>,
        footerEl
      )}
    </>
  );
};

// =====================================================================
// [추가] 구독 팝업 (지금 화면 위에 뜸)
// - onClose: 닫기 · 플랜 화면의 뒤로 / onDone: 구독 완료 → [홈으로 돌아가기]
// =====================================================================
export const SubscribePopup = ({ onClose, onDone }) => {
  const user = useAuthStore((s) => s.user);
  const onStartTrial = useAuthStore((s) => s.onStartTrial);

  // step: "plans" | "payment" | "confirm" | "done" | "fail"
  const [step, setStep] = useState("plans");
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate(); // [추가] 처음으로 돌아가기

  if (!user || (isSubscribed(user) && step !== "done")) return null;

  const p = PLANS[plan];
  const trial = !user.trialUsed && !user.subscription; // 처음 구독하는 계정만 무료 체험
  const today = startOfToday();
  const trialEnd = addDays(today, TRIAL_DAYS - 1);
  const billStart = trial ? addDays(today, TRIAL_DAYS) : today;
  const payments = getPayments(user);
  const close = onClose;
  // [추가] 구독하지 않고 나가기 → 팝업 닫고 메인 홈으로
  const goHome = () => {
    onClose?.();
    navigate("/", { replace: true });
  };

  // 플랜 → (지불 방법이 없으면) 지불 방법 등록 → 구독 확인
  const nextFromPlans = () => setStep(payments.length > 0 ? "confirm" : "payment");

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    const data = await onStartTrial(plan);
    setBusy(false);
    setStep(data ? "done" : "fail");
  };

  const dismiss = () => (step === "done" ? onDone() : onClose());

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
          {/* [추가] 구독하지 않고 빠져나가기 */}
          <button type="button" className="sub-exit-btn" onClick={goHome}>
            처음으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  // ---------- 2. 지불 방법 등록 ----------
  if (step === "payment") {
    content = (
      <PaymentForm onBack={() => setStep("plans")} onClose={close} onSaved={() => setStep("confirm")} onBusyChange={setBusy} />
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
        {/* [수정] 체크 그리기: 원이 커지며 나타난 뒤 체크 선이 그려짐 (App.scss .sub-done-check) */}
        <svg className="sub-done-check" viewBox="0 0 50 50" aria-hidden="true">
          <circle className="sub-done-check-circle" cx="25" cy="25" r="25" />
          <path className="sub-done-check-mark" d="M15.5 25.5l6.5 6.5 12.5-13" pathLength="1" />
        </svg>
        <h1 className="sub-done-title">구독이 완료되었어요</h1>
        <p className="sub-done-desc">Apple TV를 바로 즐겨보세요.</p>

        <div className="sub-done-box">
          <strong className="sub-done-plan">{PLANS[sub?.plan]?.name || p.name}</strong>
          <span className="sub-done-period">
            {isTrial ? `무료 체험 기간: ${fmtDot(start)} – ${fmtDot(end)}` : `이용 기간: ${fmtDot(start)} – ${fmtDot(end)}`}
          </span>
        </div>

        <button type="button" className="sub-btn" onClick={onDone}>
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
    <SubModal step={step} onDismiss={dismiss} dismissOnBackdrop={step !== "payment"} busy={busy}>
      {content}
    </SubModal>
  );
};

// =====================================================================
// [추가] 지불 방법 추가 팝업 (계정 설정 → 지불 방법 → [지불 방법 추가])
// - 구독 팝업의 지불 방법 등록과 같은 화면 · 뒤로 / 닫기 = 팝업 닫기
// =====================================================================
export const PaymentRegisterPopup = ({ onClose, onSaved }) => {
  const [busy, setBusy] = useState(false);
  return (
    <SubModal step="payment" onDismiss={() => !busy && onClose()} dismissOnBackdrop={false} busy={busy}>
      <PaymentForm onBack={onClose} onClose={onClose} onSaved={onSaved} onBusyChange={setBusy} cardOnly />
    </SubModal>
  );

};

// =====================================================================
// [추가] 청구 주소 팝업 (계정 설정 → 청구 주소 추가 · 편집) — 지불 방법 등록과 같은 디자인
// - [수정] 주소만 입력 (카드 · 전화번호 없음) · 저장: 이름 · 주소 · 우편번호 (users/{uid}.billing · 예전 전화번호는 그대로 둠)
// =====================================================================
const AddressForm = ({ initial, onClose, onSaved, onBusyChange }) => {
  const footerEl = useContext(FooterSlot);
  const onSaveBilling = useAuthStore((s) => s.onSaveBilling);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...fromBilling(initial) }));
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusyState] = useState(false);
  const formRef = useRef(null);

  const setBusy = (v) => {
    setBusyState(v);
    onBusyChange?.(v);
  };
  const errors = tried ? getAddressErrors(form) : [];
  const bad = (key) => errors.includes(key);

  const submit = async () => {
    if (busy) return;
    setError("");
    const errs = getAddressErrors(form);
    if (errs.length) {
      setTried(true);
      setError("입력하지 않았거나 형식이 맞지 않는 항목을 확인해 주세요.");
      requestAnimationFrame(() => {
        formRef.current?.querySelector(".sub-field.is-invalid input, .sub-select.is-invalid .sub-select-trigger")?.focus();
      });
      return;
    }
    setBusy(true);
    const ok = await onSaveBilling(toBilling(form, initial?.phone || ""));
    setBusy(false);
    if (!ok) {
      setError("청구 주소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    onSaved?.();
  };

  return (
    <>
      <SubNav onBack={onClose} onClose={onClose} />
      <form
        ref={formRef}
        id="sub-address-form"
        className="sub-pop-inner sub-pop-inner--form"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        noValidate
      >
        <SubHead title={initial ? "청구 주소 편집" : "청구 주소 추가"} desc="결제에 사용할 이름과 주소를 입력해 주세요." />

        <BillingSection form={form} setForm={setForm} bad={bad} />

        {error && <p className="sub-error" role="alert">{error}</p>}
      </form>

      {footerEl && createPortal(
        <div className="sub-pay-footer">
          <button type="submit" form="sub-address-form" className="sub-btn" disabled={busy}>
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>,
        footerEl
      )}
    </>
  );
};

export const AddressRegisterPopup = ({ initial, onClose, onSaved }) => {
  const [busy, setBusy] = useState(false);
  return (
    <SubModal step="payment" onDismiss={() => !busy && onClose()} dismissOnBackdrop={false} busy={busy}>
      <AddressForm initial={initial} onClose={onClose} onSaved={onSaved} onBusyChange={setBusy} />
    </SubModal>
  );
};

// =====================================================================
// /subscribe 주소로 들어왔을 때 (구독하기 버튼 · 계정 설정 "모든 요금제 보기" 등)
// - 로그인 전이면 로그인으로, 이미 구독 중이면 원래 화면으로
// =====================================================================
const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = AUTH_PATHS.includes(location.state?.from) ? "/" : location.state?.from || "/";
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const enteredChecked = useRef(false);

  useEffect(() => {
    if (!authReady || enteredChecked.current) return;
    enteredChecked.current = true;
    if (!user) navigate("/login", { replace: true, state: { from } });
    else if (isSubscribed(user)) navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  if (!authReady || !user) return null;

  return (
    <SubscribePopup
      onClose={() => navigate(from, { replace: true })}
      onDone={() => navigate(resumePath() || from, { replace: true })} // [수정] 하던 화면으로
    />
  );
};

export default Subscribe;
