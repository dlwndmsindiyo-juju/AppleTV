// src/pages/Profile.jsx
// 계정 설정 (시안: 계정 설정 · 기존 항목 + 신규 설정 전체 / AI 및 알림 켜짐 · 꺼짐)
// - 헤더 프로필 메뉴 "계정 설정" → /profile
// - [수정] 왼쪽 섹션 메뉴(누르면 그 섹션으로 스크롤 · 스크롤 중 고정 · 보고 있는 섹션 표시) + 오른쪽 항목
// - 오른쪽 항목: 제목 · 설명 · 링크 / 토글 / 알림 방식 체크박스
// - 모든 설정은 Firestore users/{uid} 에 바로 저장 (settings · avatar)
// - 로그인 전에 들어오면 로그인 화면으로
import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAuthStore, getSettings, ALERT_CHANNELS, getProfiles, MAIN_PROFILE_ID, getPayments, getBilling, BILLING_MAX_LENGTH, PROFILE_NAME_MAX } from "../store/useAuthStore"; // [수정] PROFILE_NAME_MAX: 프로필 이름 변경
import ProfileAvatar, { AVATAR_OPTIONS, sameAvatar, profileLook } from "../components/profile/ProfileAvatar";
import ProfilePicker from "../components/profile/ProfilePicker"; // [추가] 프로필 고르기 · 추가
import { ConfirmDialog, subscriptionSummary } from "../components/profile/AccountShared"; // [추가] 구독 · 지불 방법 (확인 팝업은 공용으로 옮김)
import { AddressRegisterPopup } from "./Subscribe"; // [추가] 청구 주소 추가 · 편집 = 지불 방법 등록과 같은 팝업 디자인
import { useMovieStore } from "../store/useMovieStore"; // [추가] 알림 설정한 콘텐츠 목록
import { TMDB_IMG } from "../utils/tmdb";
import { showToast, toastIconFor } from "../utils/toast"; // [추가] 안내 → 공용 토스트

// [추가] 알림 설정한 콘텐츠 — 공개 예정 · 검색 결과에서 종(🔔)을 누른 작품 (최근에 설정한 순)
// - 포스터를 누르면 상세 · [알림 해제] 를 누르면 목록에서 빠짐 (토스트는 store 에서)
// - 예전에 설정해서 제목 정보가 없는 작품은 "작품 정보 없음" 으로
const AlarmList = () => {
  const alarms = useMovieStore((s) => s.alarms);
  const alarmItems = useMovieStore((s) => s.alarmItems);
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);
  const list = alarms
    .map((key) => {
      const [type, id] = key.split("_");
      return { key, type: type === "tv" ? "tv" : "movie", id, ...(alarmItems[key] || {}) };
    })
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  if (list.length === 0) {
    return <p className="account-alarm-empty">아직 알림을 설정한 콘텐츠가 없어요. 공개 예정 작품의 종 버튼을 눌러 보세요.</p>;
  }

  return (
    <ul className="account-alarm-list">
      {list.map((a) => {
        const date = (a.date || "").replaceAll("-", ".");
        return (
          <li key={a.key} className="account-alarm-item">
            <Link to={`/${a.type}/${a.id}`} className="account-alarm-link">
              <span className="account-alarm-poster">
                {a.poster_path && <img src={`${TMDB_IMG}/w185${a.poster_path}`} alt="" loading="lazy" />}
              </span>
              <span className="account-alarm-text">
                <strong>{a.title || "작품 정보 없음"}</strong>
                <span>{[a.type === "tv" ? "시리즈" : "영화", date && `${date} 공개`].filter(Boolean).join(" · ")}</span>
              </span>
            </Link>
            <button type="button" className="account-alarm-off" onClick={() => onToggleAlarm(a.key)}>
              알림 해제
            </button>
          </li>
        );
      })}
    </ul>
  );
};
// 스타일: App.scss 맨 아래 "계정 설정" (.account-*)

const CHANNEL_LABELS = { email: "이메일", sms: "문자 메시지", push: "앱 푸시 알림" };

const PROVIDER_LABELS = {
  password: "이메일 · 암호",
  "google.com": "Google",
  "apple.com": "Apple",
  phone: "전화번호",
};

// [추가] 왼쪽 메뉴 · 섹션 목록 (메뉴 글자 = 섹션 이름 · 순서도 화면 순서 그대로)
const SECTIONS = [
  { id: "account-profile", title: "프로필" },
  { id: "account-access", title: "계정 액세스" },
  { id: "account-subscription", title: "구독" }, // [추가] 구독 관리 (/profile/subscription)
  { id: "account-payment", title: "지불 방법" }, // [추가] 지불 방법 관리 (/profile/payment)
  { id: "account-history", title: "재생 기록" },
  { id: "account-autoplay", title: "자동 재생" },
  { id: "account-assistant", title: "AI 어시스트" },
  { id: "account-alert", title: "알림" }, // [수정] 최신작 알림 · 경기 알림 → "알림" 섹션 하나로 묶음
];
const SECTION_TITLE = Object.fromEntries(SECTIONS.map((s) => [s.id, s.title]));

// [추가] 보고 있는 섹션 찾기: 헤더 바로 아래 기준선을 지난 마지막 섹션 (맨 아래까지 내리면 마지막 섹션)
const findActiveSection = () => {
  const header = document.querySelector("header");
  const line = (header ? header.getBoundingClientRect().bottom : 0) + 120; // 기준선: 헤더 아래 120px
  const doc = document.documentElement;
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) return SECTIONS[SECTIONS.length - 1].id;
  let active = SECTIONS[0].id;
  SECTIONS.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= line) active = id;
  });
  return active;
};

// ---------- 공통 조각 ----------
// [수정] 섹션: 이름은 왼쪽 메뉴가 대신 보여줌 (제목은 화면 읽기 프로그램용으로만 남김)
const Section = ({ id, children }) => (
  <section id={id} className="account-section" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="account-section-title">{SECTION_TITLE[id]}</h2>
    <div className="account-section-body">{children}</div>
  </section>
);

// [추가] 왼쪽 섹션 메뉴 (모바일 가로 메뉴: 표시된 메뉴가 가려지면 가로로 따라 이동)
const SectionNav = ({ active, onPick }) => {
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const item = nav?.querySelector(".account-nav-link.is-active");
    if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return;
    const left = item.offsetLeft - (nav.clientWidth - item.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);
  return (
    <nav ref={navRef} className="account-nav" aria-label="계정 설정 메뉴">
      <ul className="account-nav-list">
        {SECTIONS.map(({ id, title }) => (
          <li key={id}>
            <button
              type="button"
              className={`account-nav-link${active === id ? " is-active" : ""}`}
              aria-current={active === id ? "true" : undefined}
              onClick={() => onPick(id)}
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// 항목: 제목 + 설명 + (링크 · 토글 등)
const Item = ({ title, desc, muted = false, children }) => (
  <div className={`account-item${muted ? " is-muted" : ""}`}>
    <h3 className="account-item-title">{title}</h3>
    {desc && <p className="account-item-desc">{desc}</p>}
    {children}
  </div>
);

// 켜기 / 끄기 스위치
const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={`account-toggle${checked ? " is-on" : ""}`}
    onClick={() => onChange(!checked)}
  >
    <span className="account-toggle-track" aria-hidden="true">
      <span className="account-toggle-thumb" />
    </span>
    <span className="account-toggle-text">{checked ? "켜기" : "끄기"}</span>
  </button>
);

// 알림 받기 방식 (여러 개 선택) — 알림이 꺼져 있으면 흐리게 · 선택 불가
const ChannelPicker = ({ name, alert, onChange }) => {
  const toggle = (ch) => {
    const has = alert.channels.includes(ch);
    const channels = has ? alert.channels.filter((c) => c !== ch) : [...alert.channels, ch];
    onChange({ ...alert, channels: ALERT_CHANNELS.filter((c) => channels.includes(c)) });
  };
  return (
    <Item title="알림 받기 방식" muted={!alert.on}>
      <fieldset className="account-channels" disabled={!alert.on}>
        <legend className="account-sr-only">{name} 알림 받기 방식</legend>
        {ALERT_CHANNELS.map((ch) => (
          <label key={ch} className="account-check">
            <input
              type="checkbox"
              checked={alert.channels.includes(ch)}
              onChange={() => toggle(ch)}
            />
            {CHANNEL_LABELS[ch]}
          </label>
        ))}
      </fieldset>
      <p className="account-note">중복 선택이 가능합니다.</p>
    </Item>
  );
};

// [추가] 청구 주소 입력 (계정 설정 → 지불 방법) — 사용자가 직접 입력한 값만 저장 · 표시
const BILLING_INPUTS = [
  { key: "name", label: "이름", autoComplete: "name", required: true },
  { key: "address1", label: "주소", autoComplete: "address-line1", required: true },
  { key: "address2", label: "상세 주소", autoComplete: "address-line2" },
  { key: "postal", label: "우편번호", autoComplete: "postal-code", inputMode: "numeric" },
  { key: "phone", label: "전화번호", autoComplete: "tel", inputMode: "tel", type: "tel" },
];

const BillingDialog = ({ initial, busy, onSave, onCancel }) => {
  const [form, setForm] = useState(() => Object.fromEntries(BILLING_INPUTS.map(({ key }) => [key, initial?.[key] || ""])));
  const ready = BILLING_INPUTS.every(({ key, required }) => !required || form[key].trim());
  return (
    <ConfirmDialog
      title={initial ? "청구 주소 편집" : "청구 주소 추가"}
      desc="결제에 사용할 이름 · 주소 · 전화번호를 입력해 주세요."
      confirmLabel="저장"
      busy={busy}
      confirmDisabled={!ready}
      onConfirm={() => ready && onSave(form)}
      onCancel={onCancel}
    >
      <div className="account-form">
        {BILLING_INPUTS.map(({ key, label, autoComplete, inputMode, type = "text", required }) => (
          <label key={key} className="account-field">
            <span className="account-item-title">
              {label}
              {!required && <span className="account-field-optional"> (선택)</span>}
            </span>
            <input
              type={type}
              inputMode={inputMode}
              autoComplete={autoComplete}
              maxLength={BILLING_MAX_LENGTH}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
    </ConfirmDialog>
  );
};

// [추가] 프로필 이름 변경 팝업 — 청구 주소 팝업과 같은 디자인 (ConfirmDialog · .account-form · .account-field)
// - 최대 20자 · 빈 값 · 같은 이름이면 [저장] 비활성
// - [추가] onDelete 를 넘기면(기본 프로필 제외) 입력칸 아래 "프로필 삭제" → 삭제 확인 팝업 · 기본 프로필은 이름 변경만
const ProfileNameDialog = ({ initial, busy, onSave, onCancel, onDelete, anchor = null, title = "프로필 이름 변경" }) => {
  const [name, setName] = useState(initial || "");
  const inputRef = useRef(null);
  const clean = name.trim();
  // 팝업이 열리면 입력칸에 커서 (ConfirmDialog 가 취소 버튼에 주는 포커스보다 나중에)
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const ready = !!clean && clean !== (initial || "").trim();
  return (
    <ConfirmDialog
      title={title}
      desc={`헤더 · 프로필 선택 화면에 보이는 이름입니다. 최대 ${PROFILE_NAME_MAX}자까지 입력할 수 있습니다.`}
      confirmLabel="저장"
      busy={busy}
      confirmDisabled={!ready}
      onConfirm={() => ready && onSave(clean)}
      onCancel={onCancel}
      anchor={anchor}
    >
      <div className="account-form">
        <label className="account-field">
          <span className="account-item-title">프로필 이름</span>
          <input
            type="text"
            autoComplete="nickname"
            maxLength={PROFILE_NAME_MAX}
            value={name}
            ref={inputRef}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && ready && !e.nativeEvent.isComposing) onSave(clean);
            }}
          />
        </label>
        {onDelete && (
          <button type="button" className="account-dialog-delete" onClick={onDelete} disabled={busy}>
            프로필 삭제
          </button>
        )}
      </div>
    </ConfirmDialog>
  );
};

// =====================================================================
export const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const onUpdateSetting = useAuthStore((s) => s.onUpdateSetting);
  const onUpdateAvatar = useAuthStore((s) => s.onUpdateAvatar);
  const onClearWatchHistory = useAuthStore((s) => s.onClearWatchHistory);
  const onLogoutEverywhere = useAuthStore((s) => s.onLogoutEverywhere);
  const currentProfileId = useAuthStore((s) => s.currentProfileId) || MAIN_PROFILE_ID; // [수정] 지금 보고 있는 프로필
  const onSelectProfile = useAuthStore((s) => s.onSelectProfile);
  const onUpdateProfile = useAuthStore((s) => s.onUpdateProfile);
  const onDeleteProfile = useAuthStore((s) => s.onDeleteProfile); // [추가] 프로필 삭제
  const onSaveBilling = useAuthStore((s) => s.onSaveBilling); // [추가] 청구 주소

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // "logout" | "history" | "deleteProfile" | null
  const [billingOpen, setBillingOpen] = useState(false); // [추가] 청구 주소 입력 팝업
  const [editId, setEditId] = useState(null); // [수정] 이름 변경 · 삭제할 프로필 id (팝업 열림) — 연필 아이콘 · "프로필 이름 변경"
  const [deleteId, setDeleteId] = useState(null); // [추가] 삭제 확인 팝업의 프로필 id
  const [editAnchor, setEditAnchor] = useState(null); // [추가] 누른 연필 아이콘 위치 → 그 자리에 팝업
  const openEdit = (id, rect = null) => {
    setEditAnchor(rect);
    setEditId(id);
  };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); // 저장 결과 안내 (화면 아래 토스트)
  const leavingRef = useRef(false); // 모든 브라우저 로그아웃 중: 로그인 화면으로 튀지 않고 홈으로
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id); // [추가] 메뉴에 표시할 섹션
  const pickLockRef = useRef(null); // [추가] 메뉴로 이동하는 동안은 지나가는 섹션으로 표시가 바뀌지 않게
  const hasUser = !!user;

  // [추가] 스크롤할 때 지금 보고 있는 섹션을 메뉴에 표시
  useEffect(() => {
    if (!authReady || !hasUser) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!pickLockRef.current) setActiveSection(findActiveSection());
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(pickLockRef.current);
    };
  }, [authReady, hasUser]);

  // [추가] 구독 관리 · 지불 방법 화면에서 "뒤로" → 그 섹션으로 바로 (/profile#account-subscription)
  const hash = location.hash.slice(1);
  useEffect(() => {
    if (!authReady || !hasUser || !hash || !SECTION_TITLE[hash]) return;
    const el = document.getElementById(hash);
    if (!el) return;
    setActiveSection(hash);
    el.scrollIntoView({ block: "start" });
  }, [authReady, hasUser, hash]);

  // [수정] 안내 문구 → 공용 토스트(utils/toast.js · 사이트 다른 알림과 같은 디자인 · 화면 아래 고정이라 스크롤해도 따라옴)
  // - 예전 .account-toast 는 페이지 전환 애니메이션 안에 있어서 화면이 아니라 페이지 맨 아래에 붙어 있었음
  useEffect(() => {
    if (!message) return;
    showToast(message, { icon: toastIconFor(message) });
    setMessage("");
  }, [message]);

  if (!authReady) return <main className="account-page" />;
  if (!user) {
    if (leavingRef.current) return <main className="account-page" />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const settings = getSettings(user);
  const payments = getPayments(user); // [추가] 지불 방법 (맨 앞이 기본)
  const billing = getBilling(user); // [추가] 청구 주소 (사용자가 입력한 값 · 없으면 null)

  const saveBilling = async (form) => {
    setBusy(true);
    const ok = await onSaveBilling(form);
    setBusy(false);
    if (ok) setBillingOpen(false);
    setMessage(ok ? "청구 주소를 저장했어요." : "청구 주소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  const save = async (key, value) => {
    const ok = await onUpdateSetting(key, value);
    if (!ok) setMessage("설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  // [추가] 알림 저장 + 안내 문구 (켜기 · 끄기 · 받기 방식 변경)
  const saveAlert = async (key, name, next) => {
    const prev = settings[key];
    const ok = await onUpdateSetting(key, next);
    if (!ok) {
      setMessage("알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (prev.on !== next.on) {
      setMessage(next.on ? `${name}을 켰어요.` : `${name}을 껐어요.`);
    } else if (!next.channels.length) {
      setMessage(`${name}을 받을 방식이 없어요. 하나 이상 골라 주세요.`);
    }
    // [삭제] 받기 방식(이메일 · 문자 · 앱 푸시)을 고를 때 뜨던 "받기 방식을 바꿨어요." 안내 — 체크 표시로 충분해서 띄우지 않음
  };
  // [추가] 모든 알림 한 번에 켜기 · 끄기
  const saveAllAlerts = async (on) => {
    const results = await Promise.all([
      onUpdateSetting("releaseAlert", { ...settings.releaseAlert, on }),
      onUpdateSetting("sportAlert", { ...settings.sportAlert, on }),
    ]);
    if (results.every(Boolean)) setMessage(on ? "모든 알림을 켰어요." : "모든 알림을 껐어요.");
    else setMessage("알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  // [수정] 프로필 이름 저장 (고른 프로필 · 지금 프로필이면 헤더 이름도 바로 바뀜)
  const saveProfileName = async (name) => {
    setBusy(true);
    const ok = await onUpdateProfile(editId, { name });
    setBusy(false);
    if (ok) setEditId(null);
    setMessage(ok ? "프로필 이름을 바꿨어요." : "프로필 이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  // [수정] 프로필 아이콘은 지금 보고 있는 프로필에 저장 (프로필마다 다른 아이콘)
  const pickAvatar = async (opt) => {
    const ok = await onUpdateProfile(currentProfileId, { avatar: opt });
    setMessage(ok ? "프로필 아이콘을 바꿨어요." : "프로필 아이콘을 저장하지 못했어요.");
  };

  const confirmDialog = async () => {
    setBusy(true);
    // [추가] 프로필 삭제 → 지금 보던 프로필이면 기본 프로필로 자동 전환 (useAuthStore.onDeleteProfile)
    if (dialog === "deleteProfile") {
      const name = profiles.find((p) => p.id === deleteId)?.name || "";
      const ok = await onDeleteProfile(deleteId);
      setBusy(false);
      setMessage(ok ? `${name} 프로필을 삭제했어요.` : "프로필을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setDialog(null);
      setDeleteId(null);
      return;
    }
    if (dialog === "logout") {
      leavingRef.current = true;
      const ok = await onLogoutEverywhere();
      leavingRef.current = ok;
      setBusy(false);
      if (ok) {
        navigate("/", { replace: true });
        return;
      }
      setMessage("로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } else {
      const ok = await onClearWatchHistory();
      setBusy(false);
      setMessage(ok ? "재생 기록을 지웠어요." : "재생 기록을 지우지 못했어요.");
    }
    setDialog(null);
  };

  // [수정] 다른 프로필로 보기 (최대 5개 · "+" 로 추가)
  const profiles = getProfiles(user);
  const currentProfile = profiles.find((p) => p.id === currentProfileId) || profiles[0];
  const look = profileLook(profiles, currentProfile?.id);
  const pickProfile = (id) => {
    if (id === currentProfileId) return;
    onSelectProfile(id);
    setMessage(`${profiles.find((p) => p.id === id)?.name || ""} 프로필로 보고 있어요.`);
  };

  // [추가] 메뉴를 누르면 그 섹션으로 부드럽게 스크롤 (헤더에 가리지 않는 위치는 CSS scroll-margin-top)
  const pickSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveSection(id);
    clearTimeout(pickLockRef.current);
    pickLockRef.current = setTimeout(() => {
      pickLockRef.current = null;
    }, 900);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const providers = (auth.currentUser?.providerData || []).map((p) => ({
    id: p.providerId,
    label: PROVIDER_LABELS[p.providerId] || p.providerId,
    email: p.email,
  }));

  return (
    <main className="account-page">
      <div className="account-inner">
        <h1 className="account-title">계정 설정</h1>

        {/* [추가] 왼쪽 메뉴 + 오른쪽 섹션 */}
        <div className="account-layout">
          <SectionNav active={activeSection} onPick={pickSection} />
          <div className="account-sections">

            {/* ---------- 프로필 (기본 아이콘 선택) ---------- */}
            <Section id="account-profile">
              <div className="account-profile">
                <ProfileAvatar avatar={look.avatar} tone={look.tone} size="lg" />
                <div className="account-profile-text">
                  <strong>{currentProfile?.name || user.name || "Apple 사용자"}</strong>{/* [수정] 지금 프로필 이름 */}
                  <span>{user.email}</span>
                </div>
              </div>
              {/* [삭제] "프로필 이름 변경" 칸 — 프로필 이름 옆 연필 아이콘으로 대신함 */}
              {/* [수정] 프로필 삭제 칸 없앰 → 아래 프로필 이름 옆 연필 아이콘 (이름 변경 · 삭제) */}
              <Item title="다른 프로필로 보기">
                <ProfilePicker className="account-profile-picker" current={currentProfileId} onPick={pickProfile} onEdit={openEdit} />
              </Item>
              <Item title="프로필 아이콘" desc="현재 프로필에 적용된 아이콘이 아닌 다른 아이콘을 선택하여 변경할 수 있습니다.">
                <button
                  type="button"
                  className="account-link"
                  aria-expanded={avatarOpen}
                  aria-controls="account-avatar-grid"
                  onClick={() => setAvatarOpen((v) => !v)}
                >
                  {avatarOpen ? "닫기" : "프로필 아이콘 변경"}
                </button>
                {avatarOpen && (
                  <ul id="account-avatar-grid" className="account-avatar-grid" role="radiogroup" aria-label="프로필 아이콘">
                    {AVATAR_OPTIONS.map((opt) => {
                      const on = sameAvatar(currentProfile?.avatar, opt);
                      return (
                        <li key={`${opt.icon}-${opt.color}`}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={opt.label}
                            className={`account-avatar-option${on ? " is-on" : ""}`}
                            onClick={() => !on && pickAvatar(opt)}
                          >
                            <ProfileAvatar avatar={opt} size="md" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Item>
            </Section>

 {/* ---------- [추가] 지불 방법 ---------- */}
            {/* - 지불 유형 · 청구 주소 · 국가/지역 한 줄 (휴대폰은 위아래) · 청구 주소는 사용자가 입력한 값만 */}
            <Section id="account-payment">
              <div className="account-item-row">
                <Item
                  title="지불 유형"
                  desc={payments[0] ? `${payments[0].brand} •••• ${payments[0].last4}` : "등록된 지불 방법이 없습니다."}
                >
                  <Link className="account-link" to="/profile/payment">
                    지불 방법 관리
                  </Link>
                </Item>
                <Item title="청구 주소">
                  {billing ? (
                    <address className="account-address">
                      {["name", "address1", "address2", "postal", "phone"]
                        .filter((k) => billing[k])
                        .map((k) => (
                          <span key={k}>{billing[k]}</span>
                        ))}
                    </address>
                  ) : (
                    <p className="account-item-desc">등록된 청구 주소가 없습니다.</p>
                  )}
                  <button type="button" className="account-link" onClick={() => setBillingOpen(true)}>
                    {billing ? "청구 주소 편집" : "청구 주소 추가"}
                  </button>
                </Item>
                <Item title="국가/지역" desc="대한민국" />
              </div>
            </Section>

              {/* ---------- [추가] 구독 ---------- */}
            <Section id="account-subscription">
              <Item title="구독을 확인 및 관리합니다." desc={subscriptionSummary(user)}>
                <Link className="account-link" to="/profile/subscription">
                  관리
                </Link>
              </Item>
            </Section>

           
            {/* ---------- 계정 액세스 ---------- */}
            <Section id="account-access">
              <Item
                title="웹용 Apple TV, Apple Music 및 Apple 팟캐스트"
                desc="웹 브라우저에서 Apple TV에 로그인하면 Apple 어플리케이션에 자동으로 로그인 되어 이 연결을 해제할 수 있습니다."
              >
                <button type="button" className="account-link" onClick={() => setDialog("logout")}>
                  모든 브라우저에서 로그아웃
                </button>
              </Item>
              <Item title="연결된 계정" desc="계정에 연결한 앱 및 서비스를 관리해보세요.">
                <button
                  type="button"
                  className="account-link"
                  aria-expanded={providersOpen}
                  onClick={() => setProvidersOpen((v) => !v)}
                >
                  연결된 계정 관리
                </button>
                {providersOpen && (
                  <ul className="account-providers">
                    {providers.length === 0 && <li className="account-note">연결된 계정이 없습니다.</li>}
                    {providers.map((p) => (
                      <li key={p.id}>
                        <strong>{p.label}</strong>
                        {p.email && <span>{p.email}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Item>
            </Section>

          

            {/* ---------- 재생 기록 ---------- */}
            <Section id="account-history">
              <Item title="Apple TV 앱에서 시청한 내역 삭제">
                <button type="button" className="account-link" onClick={() => setDialog("history")}>
                  재생 기록 지우기
                </button>
              </Item>
            </Section>

            {/* ---------- 자동 재생 ---------- */}
            <Section id="account-autoplay">
              <Item title="다음 에피소드 재생" desc="에피소드가 끝나면 다음 에피소드를 자동으로 재생합니다.">
                <Toggle
                  label="다음 에피소드 재생"
                  checked={settings.autoplayNext}
                  onChange={(v) => save("autoplayNext", v)}
                />
              </Item>
              <Item
                title="추천 항목 재생"
                desc="시리즈나 영화, 스포츠 경기가 끝나면 사용자를 위한 추천 콘텐츠를 자동으로 재생합니다."
              >
                <Toggle
                  label="추천 항목 재생"
                  checked={settings.autoplayRecommend}
                  onChange={(v) => save("autoplayRecommend", v)}
                />
              </Item>
            </Section>

            {/* ---------- AI ---------- */}
            <Section id="account-assistant">
              <Item
                title="Apple Assistant 사용"
                desc={
                  settings.assistant
                    ? "무엇을 볼지 고민될 때, 취향과 기분에 맞는 콘텐츠를 찾도록 도와줍니다."
                    : "무엇을 볼지 고민될 때, 대화로 취향과 기분에 맞는 콘텐츠를 찾도록 도와줍니다."
                }
              >
                <Toggle
                  label="Apple Assistant 사용"
                  checked={settings.assistant}
                  onChange={(v) => save("assistant", v)}
                />
              </Item>
            </Section>

            {/* ---------- [수정] 알림 (최신작 · 경기) — 섹션 하나로 묶음 · 켜고 끌 때 안내 문구 ---------- */}
            <Section id="account-alert">
              <Item title="모든 알림 받기" desc="최신작 알림과 경기 알림을 한 번에 켜거나 끕니다.">
                <Toggle
                  label="모든 알림 받기"
                  checked={settings.releaseAlert.on || settings.sportAlert.on}
                  onChange={(v) => saveAllAlerts(v)}
                />
              </Item>

              <div className="account-alert-group">
                <Item title="최신작 알림 받기" desc="새로운 영화와 시리즈가 공개되면 선택한 방식으로 알려드립니다.">
                  <Toggle
                    label="최신작 알림 받기"
                    checked={settings.releaseAlert.on}
                    onChange={(v) => saveAlert("releaseAlert", "최신작 알림", { ...settings.releaseAlert, on: v })}
                  />
                </Item>
                <ChannelPicker
                  name="최신작"
                  alert={settings.releaseAlert}
                  onChange={(v) => saveAlert("releaseAlert", "최신작 알림", v)}
                />
              </div>

              <div className="account-alert-group">
                <Item
                  title="경기 알림 받기"
                  desc="관심 있는 팀과 리그의 경기가 시작되기 전에 선택한 방식으로 알려드립니다."
                >
                  <Toggle
                    label="경기 알림 받기"
                    checked={settings.sportAlert.on}
                    onChange={(v) => saveAlert("sportAlert", "경기 알림", { ...settings.sportAlert, on: v })}
                  />
                </Item>
                <ChannelPicker
                  name="경기"
                  alert={settings.sportAlert}
                  onChange={(v) => saveAlert("sportAlert", "경기 알림", v)}
                />
              </div>

              {/* [추가] 알림 설정한 콘텐츠 */}
              <div className="account-alert-group">
                <Item title="알림 설정한 콘텐츠" desc="공개되면 알려드릴 작품이에요. 포스터를 누르면 작품 상세로 이동해요." />
                <AlarmList />
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* [수정] 청구 주소: 지불 방법 등록과 같은 팝업 (저장은 팝업 안에서) · 예전 BillingDialog 는 안 씀 */}
      {billingOpen && (
        <AddressRegisterPopup
          initial={billing}
          onClose={() => setBillingOpen(false)}
          onSaved={() => {
            setBillingOpen(false);
            setMessage("청구 주소를 저장했어요.");
          }}
        />
      )}
      {dialog === "logout" && (
        <ConfirmDialog
          title="모든 브라우저에서 로그아웃할까요?"
          desc="이 브라우저에서 바로 로그아웃되고, 다른 브라우저는 다음에 사이트를 열 때 로그아웃됩니다."
          confirmLabel="로그아웃"
          busy={busy}
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
      {/* [추가] 프로필 편집 (이름 변경 · 삭제) */}
      {editId && profiles.some((p) => p.id === editId) && (
        <ProfileNameDialog
          key={editId}
          title={editId === MAIN_PROFILE_ID ? "프로필 이름 변경" : "프로필 편집"} // [수정] 기본 프로필: 이름 변경만
          initial={profiles.find((p) => p.id === editId)?.name || ""}
          busy={busy}
          onSave={saveProfileName}
          onCancel={() => !busy && setEditId(null)}
          onDelete={
            editId === MAIN_PROFILE_ID
              ? undefined
              : () => {
                  setDeleteId(editId);
                  setEditId(null);
                  setDialog("deleteProfile");
                }
          }
        />
      )}
      {dialog === "deleteProfile" && (
        <ConfirmDialog
          title={`'${profiles.find((p) => p.id === deleteId)?.name || ""}' 프로필을 삭제할까요?`}
          desc="이 프로필의 이름 · 아이콘이 삭제되며 되돌릴 수 없습니다."
          confirmLabel="삭제"
          busy={busy}
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "history" && (
        <ConfirmDialog
          title="재생 기록을 지울까요?"
          desc="모든 가족 프로필의 시청 내역이 삭제되며 되돌릴 수 없습니다."
          confirmLabel="지우기"
          busy={busy}
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* [수정] 안내는 공용 토스트로 (위 effect) */}
    </main>
  );
};

export default Profile;
