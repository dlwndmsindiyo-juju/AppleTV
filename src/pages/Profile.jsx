// src/pages/Profile.jsx
// 계정 설정 (시안: 계정 설정 · 기존 항목 + 신규 설정 전체 / AI 및 알림 켜짐 · 꺼짐)
// - 헤더 프로필 메뉴 "계정 설정" → /profile
// - [수정] 왼쪽 섹션 메뉴(누르면 그 섹션으로 스크롤 · 스크롤 중 고정 · 보고 있는 섹션 표시) + 오른쪽 항목
// - 오른쪽 항목: 제목 · 설명 · 링크 / 토글 / 알림 방식 체크박스
// - 모든 설정은 Firestore users/{uid} 에 바로 저장 (settings · avatar)
// - 로그인 전에 들어오면 로그인 화면으로
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAuthStore, getSettings, ALERT_CHANNELS, getProfiles, MAIN_PROFILE_ID } from "../store/useAuthStore";
import ProfileAvatar, { AVATAR_OPTIONS, sameAvatar, profileLook } from "../components/profile/ProfileAvatar";
import ProfilePicker from "../components/profile/ProfilePicker"; // [추가] 프로필 고르기 · 추가
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
  { id: "account-history", title: "재생 기록" },
  { id: "account-autoplay", title: "자동 재생" },
  { id: "account-assistant", title: "AI 어시스트" },
  { id: "account-release", title: "최신작 알림" },
  { id: "account-sport", title: "경기 알림" },
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
      <span className="accoun t-toggle-thumb" />
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

// 확인 팝업 (모든 브라우저에서 로그아웃 · 재생 기록 지우기)
const ConfirmDialog = ({ title, desc, confirmLabel, busy, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);
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

  return (
    <div className="account-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="account-dialog" role="alertdialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <h2 id="account-dialog-title" className="account-dialog-title">{title}</h2>
        <p className="account-dialog-desc">{desc}</p>
        <div className="account-dialog-actions">
          <button ref={cancelRef} type="button" className="account-btn account-btn--secondary" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className="account-btn" onClick={onConfirm} disabled={busy}>
            {busy ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
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

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // "logout" | "history" | null
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

  // 안내 문구는 3초 뒤 사라짐
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!authReady) return <main className="account-page" />;
  if (!user) {
    if (leavingRef.current) return <main className="account-page" />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const settings = getSettings(user);

  const save = async (key, value) => {
    const ok = await onUpdateSetting(key, value);
    if (!ok) setMessage("설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  };

  // [수정] 프로필 아이콘은 지금 보고 있는 프로필에 저장 (프로필마다 다른 아이콘)
  const pickAvatar = async (opt) => {
    const ok = await onUpdateProfile(currentProfileId, { avatar: opt });
    setMessage(ok ? "프로필 아이콘을 바꿨어요." : "프로필 아이콘을 저장하지 못했어요.");
  };

  const confirmDialog = async () => {
    setBusy(true);
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
                  <strong>{user.name || "Apple 사용자"}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <Item title="다른 프로필로 보기">
                <ProfilePicker className="account-profile-picker" current={currentProfileId} onPick={pickProfile} />
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

            {/* ---------- 최신작 알림 ---------- */}
            <Section id="account-release">
              <Item title="최신작 알림 받기" desc="새로운 영화와 시리즈가 공개되면 선택한 방식으로 알려드립니다.">
                <Toggle
                  label="최신작 알림 받기"
                  checked={settings.releaseAlert.on}
                  onChange={(v) => save("releaseAlert", { ...settings.releaseAlert, on: v })}
                />
              </Item>
              <ChannelPicker
                name="최신작"
                alert={settings.releaseAlert}
                onChange={(v) => save("releaseAlert", v)}
              />
            </Section>

            {/* ---------- 경기 알림 ---------- */}
            <Section id="account-sport">
              <Item
                title="경기 알림 받기"
                desc="관심 있는 팀과 리그의 경기가 시작되기 전에 선택한 방식으로 알려드립니다."
              >
                <Toggle
                  label="경기 알림 받기"
                  checked={settings.sportAlert.on}
                  onChange={(v) => save("sportAlert", { ...settings.sportAlert, on: v })}
                />
              </Item>
              <ChannelPicker
                name="경기"
                alert={settings.sportAlert}
                onChange={(v) => save("sportAlert", v)}
              />
            </Section>
          </div>
        </div>
      </div>

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

      <p className={`account-toast${message ? " is-show" : ""}`} role="status" aria-live="polite">
        {message}
      </p>
    </main>
  );
};

export default Profile;
