// src/pages/Profile.jsx
// 계정 설정 (시안: 계정 설정 · 기존 항목 + 신규 설정 전체 / AI 및 알림 켜짐 · 꺼짐)
// - 헤더 프로필 메뉴 "계정 설정" → /profile
// - 왼쪽 섹션 이름 + 오른쪽 항목 (제목 · 설명 · 링크 / 토글 / 알림 방식 체크박스)
// - 모든 설정은 Firestore users/{uid} 에 바로 저장 (settings · avatar)
// - 로그인 전에 들어오면 로그인 화면으로
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAuthStore, getSettings, ALERT_CHANNELS } from "../store/useAuthStore";
import ProfileAvatar, { AVATAR_OPTIONS, sameAvatar } from "../components/profile/ProfileAvatar";
// 스타일: App.scss 맨 아래 "계정 설정" (.account-*)

const CHANNEL_LABELS = { email: "이메일", sms: "문자 메시지", push: "앱 푸시 알림" };

const PROVIDER_LABELS = {
  password: "이메일 · 암호",
  "google.com": "Google",
  "apple.com": "Apple",
  phone: "전화번호",
};

// ---------- 공통 조각 ----------
// 섹션: 왼쪽 이름 + 오른쪽 항목들
const Section = ({ title, children }) => (
  <section className="account-section">
    <h2 className="account-section-title">{title}</h2>
    <div className="account-section-body">{children}</div>
  </section>
);

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
      <p className="account-note">원하는 방식을 여러 개 선택할 수 있습니다.</p>
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

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // "logout" | "history" | null
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); // 저장 결과 안내 (화면 아래 토스트)
  const leavingRef = useRef(false); // 모든 브라우저 로그아웃 중: 로그인 화면으로 튀지 않고 홈으로

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

  const pickAvatar = async (opt) => {
    const ok = await onUpdateAvatar(opt);
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

  const providers = (auth.currentUser?.providerData || []).map((p) => ({
    id: p.providerId,
    label: PROVIDER_LABELS[p.providerId] || p.providerId,
    email: p.email,
  }));

  return (
    <main className="account-page">
      <div className="account-inner">
        <h1 className="account-title">계정 설정</h1>

        {/* ---------- 프로필 (기본 아이콘 선택) ---------- */}
        <Section title="프로필">
          <div className="account-profile">
            <ProfileAvatar avatar={user.avatar} size="lg" />
            <div className="account-profile-text">
              <strong>{user.name || "Apple 사용자"}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <Item title="프로필 아이콘" desc="헤더에 보이는 프로필 아이콘을 기본 아이콘 중에서 고를 수 있습니다.">
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
                  const on = sameAvatar(user.avatar, opt);
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
        <Section title="계정 액세스">
          <Item
            title="웹용 Apple TV, Apple Music 및 Apple 팟캐스트"
            desc="웹 브라우저에서 Apple TV에 로그인하면 자동으로 Apple Music과 Apple 팟캐스트에 로그인되며 웹에서 팟캐스트 및 음악을 재생할 수 있게 됩니다. 또한 언제든지 모든 서비스와 브라우저에서 로그아웃할 수 있습니다."
          >
            <button type="button" className="account-link" onClick={() => setDialog("logout")}>
              모든 브라우저에서 로그아웃
            </button>
          </Item>
          <Item title="연결된 계정" desc="계정에 연결한 앱 및 서비스를 관리하십시오.">
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
        <Section title="재생 기록">
          <Item title="Apple TV 앱에서 시청한 내역 삭제">
            <button type="button" className="account-link" onClick={() => setDialog("history")}>
              재생 기록 지우기
            </button>
          </Item>
        </Section>

        {/* ---------- 자동 재생 ---------- */}
        <Section title="자동 재생">
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

        {/* ---------- AI 챗봇 ---------- */}
        <Section title="AI 챗봇">
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

        {/* ---------- 신규 출시 알림 ---------- */}
        <Section title="신규 출시 알림">
          <Item title="신규 출시 알림 받기" desc="새로운 영화와 시리즈가 공개되면 선택한 방식으로 알려드립니다.">
            <Toggle
              label="신규 출시 알림 받기"
              checked={settings.releaseAlert.on}
              onChange={(v) => save("releaseAlert", { ...settings.releaseAlert, on: v })}
            />
          </Item>
          <ChannelPicker
            name="신규 출시"
            alert={settings.releaseAlert}
            onChange={(v) => save("releaseAlert", v)}
          />
        </Section>

        {/* ---------- 스포츠 경기 알림 ---------- */}
        <Section title="스포츠 경기 알림">
          <Item
            title="스포츠 경기 알림 받기"
            desc="관심 있는 팀과 리그의 경기가 시작되기 전에 선택한 방식으로 알려드립니다."
          >
            <Toggle
              label="스포츠 경기 알림 받기"
              checked={settings.sportAlert.on}
              onChange={(v) => save("sportAlert", { ...settings.sportAlert, on: v })}
            />
          </Item>
          <ChannelPicker
            name="스포츠 경기"
            alert={settings.sportAlert}
            onChange={(v) => save("sportAlert", v)}
          />
        </Section>
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
