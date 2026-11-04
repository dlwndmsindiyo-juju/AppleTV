// src/components/profile/ProfileAvatar.jsx
// 프로필 아이콘 (기본 아이콘 중에서 선택) — 헤더 · 계정 설정에서 함께 사용
// - users/{uid}.avatar = { icon: "face-smile", color: "primary" }
// - 아이콘 모양: public/icons/wishlist/{icon}.svg (글자색을 따라가는 mask)
// - 배경색: App.scss 의 .profile-avatar--{color} (_variables.scss 색 토큰)
import React from "react";

// 고를 수 있는 기본 아이콘 (아이콘 + 배경색 조합)
export const AVATAR_OPTIONS = [
  { icon: "face-smile", color: "primary", label: "웃는 얼굴" },
  { icon: "face-baby-smile", color: "rating", label: "아기 얼굴" },
  { icon: "face-surprise", color: "accent", label: "놀란 얼굴" },
  { icon: "face-nomal", color: "success", label: "기본 얼굴" },
  { icon: "face-horror", color: "dark", label: "무서운 얼굴" },
  { icon: "devil", color: "sports", label: "악마" },
  { icon: "heart", color: "live", label: "하트" },
  { icon: "diamond", color: "accent", label: "다이아몬드" },
  { icon: "clover", color: "success", label: "클로버" },
  { icon: "spade", color: "dark", label: "스페이드" },
  { icon: "basketball", color: "rating", label: "농구공" },
  { icon: "car", color: "primary", label: "자동차" },
];

export const AVATAR_COLORS = ["primary", "sports", "live", "success", "rating", "accent", "dark"];

// 저장된 값이 목록에 없는 아이콘 · 색이면 무시 (예전 데이터 · 잘못된 값 방어)
export const isValidAvatar = (avatar) =>
  Boolean(
    avatar &&
      AVATAR_OPTIONS.some((o) => o.icon === avatar.icon) &&
      AVATAR_COLORS.includes(avatar.color),
  );

export const sameAvatar = (a, b) => Boolean(a && b && a.icon === b.icon && a.color === b.color);

// [추가] 가족 프로필별 색 — 로그인 프로필 선택 화면(PC .auth-profile · TV .tv-profile)과 같은 순서 · 같은 색
// - 색 값은 App.scss 의 :root --profile-member-{색} (_variables.scss 토큰)
export const MEMBER_COLORS = { 아빠: "primary", 엄마: "sports", 아들: "accent", 딸: "success" };

// avatar 가 없으면 기존 기본 프로필 이미지(public/icons/profile.svg)
// member: [추가] 지금 고른 가족 프로필 (아빠 · 엄마 · 아들 · 딸) → 그 프로필 색 원 + 사람 아이콘
const ProfileAvatar = ({ avatar, member, size = "md", className = "" }) => {
  if (MEMBER_COLORS[member]) {
    return (
      <span
        className={`profile-avatar profile-avatar--${size} profile-avatar--member ${className}`}
        style={{ backgroundColor: `var(--profile-member-${MEMBER_COLORS[member]})` }}
        title={member}
      >
        <img src="/icons/profile.svg" alt="" aria-hidden="true" />
      </span>
    );
  }
  if (!isValidAvatar(avatar)) {
    return (
      <span className={`profile-avatar profile-avatar--${size} profile-avatar--empty ${className}`}>
        <img src="/icons/profile.svg" alt="" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className={`profile-avatar profile-avatar--${size} profile-avatar--${avatar.color} ${className}`}
      aria-hidden="true"
    >
      <span
        className="profile-avatar-icon"
        style={{
          WebkitMaskImage: `url(/icons/wishlist/${avatar.icon}.svg)`,
          maskImage: `url(/icons/wishlist/${avatar.icon}.svg)`,
        }}
      />
    </span>
  );
};

export default ProfileAvatar;
