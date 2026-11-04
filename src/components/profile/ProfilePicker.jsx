// src/components/profile/ProfilePicker.jsx
// [추가] 프로필 고르기 · 추가 (OTT 방식 · 최대 5개) — 로그인 "누가 시청하나요?" · 계정 설정 "다른 프로필로 보기" 공용
// - 프로필: users/{uid}.profiles (useAuthStore) · 첫 프로필은 계정 이름으로 자동 생성
// - 프로필 옆 "+" 를 누르면 이름 · 아이콘(기존 12개)을 정해서 바로 추가 → 추가한 프로필은 목록에 바로 나타남
// - 아이콘을 고르지 않으면 순서대로 프로필 기본 색 (ProfileAvatar tone)
// - 스타일: App.scss (.profile-picker) · 지금 프로필 선택 화면(.auth-profiles)과 같은 모양
import React, { useState } from "react";
import { useAuthStore, getProfiles, PROFILE_MAX, PROFILE_NAME_MAX } from "../../store/useAuthStore";
import ProfileAvatar, { AVATAR_OPTIONS, sameAvatar, toneOf } from "./ProfileAvatar";

// onPick(id): 프로필을 골랐을 때 · current: 지금 프로필 id (계정 설정에서 표시)
const ProfilePicker = ({ onPick, current = null, className = "" }) => {
  const user = useAuthStore((s) => s.user);
  const onAddProfile = useAuthStore((s) => s.onAddProfile);
  const profiles = getProfiles(user);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => {
    setName("");
    setAvatar(null);
    setError("");
    setAdding(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("프로필 이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    const id = await onAddProfile({ name, avatar });
    setBusy(false);
    if (!id) {
      setError("프로필을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setAdding(false);
  };

  return (
    <div className={`profile-picker ${className}`.trim()}>
      <ul className="profile-picker-list">
        {profiles.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              className={`profile-picker-item${current === p.id ? " is-current" : ""}`}
              aria-pressed={current ? current === p.id : undefined}
              onClick={() => onPick?.(p.id)}
            >
              <span className="profile-picker-avatar" aria-hidden="true">
                <ProfileAvatar avatar={p.avatar} tone={toneOf(i)} size="sm" />
              </span>
              <span className="profile-picker-name">{p.name}</span>
            </button>
          </li>
        ))}

        {/* 프로필 추가 (최대 5개) */}
        {profiles.length < PROFILE_MAX && !adding && (
          <li>
            <button type="button" className="profile-picker-item profile-picker-add" onClick={openAdd}>
              <span className="profile-picker-avatar" aria-hidden="true">
                <img src="/icons/plus.svg" alt="" />
              </span>
              <span className="profile-picker-name">프로필 추가</span>
            </button>
          </li>
        )}
      </ul>

      {adding && (
        <form className="profile-picker-form" onSubmit={save}>
          <label className="profile-picker-label" htmlFor="profile-picker-name">
            프로필 이름
          </label>
          <input
            id="profile-picker-name"
            className="profile-picker-input"
            value={name}
            maxLength={PROFILE_NAME_MAX}
            placeholder="이름 (최대 20자)"
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />

          <p className="profile-picker-label">프로필 아이콘</p>
          <ul className="profile-picker-icons" role="radiogroup" aria-label="프로필 아이콘">
            {AVATAR_OPTIONS.map((opt) => {
              const on = sameAvatar(avatar, opt);
              return (
                <li key={`${opt.icon}-${opt.color}`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={opt.label}
                    className={`profile-picker-icon${on ? " is-on" : ""}`}
                    onClick={() => setAvatar(on ? null : opt)}
                  >
                    <ProfileAvatar avatar={opt} size="md" />
                  </button>
                </li>
              );
            })}
          </ul>

          {error && <p className="profile-picker-error">{error}</p>}

          <div className="profile-picker-actions">
            <button type="button" className="profile-picker-btn is-ghost" onClick={() => setAdding(false)}>
              취소
            </button>
            <button type="submit" className="profile-picker-btn" disabled={busy}>
              {busy ? "추가 중…" : "프로필 추가"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProfilePicker;
