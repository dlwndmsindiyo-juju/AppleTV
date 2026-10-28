// src/components/wishlist/WishlistLayer.jsx
// 위시리스트 공용 레이어 (App.jsx 에서 한 번만 렌더)
// - 로그인 계정과 위시리스트(Firestore) 연결
// - "어떤 그룹에 추가할까요?" 팝업 · "새 그룹 만들기" 팝업 · 추가 토스트
// 어느 화면에서 하트를 눌러도 같은 팝업 · 토스트가 뜨도록 여기서 한 번에 관리
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import {
  GROUP_ICONS,
  GROUP_NAME_MAX,
  formatCount,
  useHeartStore,
} from "../../store/useHeartStore";

const IMG = "https://image.tmdb.org/t/p";
const TOAST_MS = 4000;

// 위시리스트 아이콘 (public/icons/wishlist/{name}.svg · 글자색을 따라감)
export const WishIcon = ({ name, className = "" }) => (
  <span
    className={`wish-icon ${className}`}
    style={{
      WebkitMaskImage: `url(/icons/wishlist/${name}.svg)`,
      maskImage: `url(/icons/wishlist/${name}.svg)`,
    }}
    aria-hidden="true"
  />
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// 팝업 공통: Esc 로 닫기 · 뒤 화면 스크롤 막기 · 바깥 클릭으로 닫기
const Modal = ({ labelId, onClose, className = "", children }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="wish-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`wish-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelId}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// ---------- 어떤 그룹에 추가할까요? ----------
const GroupPicker = () => {
  const { pickerKey, items, groups, onToggleGroup, onClosePicker, onOpenNewGroup } = useHeartStore();
  const item = items[pickerKey];
  if (!item) return null;

  // 그룹 썸네일: 그 그룹에 마지막으로 담은 작품 포스터
  const groupInfo = (groupId) => {
    const list = Object.values(items).filter((it) => it.groups.includes(groupId));
    const latest = list.sort((a, b) => b.addedAt - a.addedAt)[0];
    return { count: list.length, poster: latest?.poster_path };
  };

  return (
    <Modal labelId="wish-picker-title" onClose={onClosePicker} className="wish-picker">
      <div className="wish-modal-head">
        <h2 id="wish-picker-title">어떤 그룹에 추가할까요?</h2>
        <button type="button" className="wish-close" onClick={onClosePicker} aria-label="닫기">
          <CloseIcon />
        </button>
      </div>

      <ul className="wish-group-list">
        {groups.map((g) => {
          const { count, poster } = groupInfo(g.id);
          const checked = item.groups.includes(g.id);
          return (
            <li key={g.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`wish-group-row${checked ? " is-checked" : ""}`}
                onClick={() => onToggleGroup(pickerKey, g.id)}
              >
                <span className="wish-group-thumb">
                  {poster ? (
                    <img src={`${IMG}/w154${poster}`} alt="" loading="lazy" />
                  ) : (
                    <WishIcon name={g.icon} />
                  )}
                </span>
                <span className="wish-group-text">
                  <strong>{g.name}</strong>
                  <span>저장 콘텐츠 {formatCount(count)}개</span>
                </span>
                <img
                  className="wish-check"
                  src={`/icons/wishlist/${checked ? "check-on" : "check-off"}.svg`}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="wish-modal-foot">
        <button type="button" className="wish-btn wish-btn--white wish-btn--full" onClick={onOpenNewGroup}>
          새 그룹 만들기
        </button>
      </div>
    </Modal>
  );
};

// ---------- 새 그룹 만들기 ----------
const NewGroup = () => {
  const { onCreateGroup, onCloseNewGroup } = useHeartStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(GROUP_ICONS[0]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onCreateGroup(name, icon);
    setBusy(false);
  };

  const selected = GROUP_ICONS.indexOf(icon) + 1;

  return (
    <Modal labelId="wish-new-title" onClose={onCloseNewGroup} className="wish-new">
      <form onSubmit={submit}>
        <div className="wish-modal-head">
          <h2 id="wish-new-title">새 그룹 만들기</h2>
          <button type="button" className="wish-close" onClick={onCloseNewGroup} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>

        <input
          ref={inputRef}
          className="wish-input"
          type="text"
          value={name}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="그룹 이름"
          aria-label="그룹 이름"
        />

        <div className="wish-icon-head">
          <span>아이콘 선택</span>
          {/* 시안 "6 / 30": 고른 아이콘 번호 / 전체 아이콘 수 */}
          <span className="wish-icon-count">
            {selected} / {GROUP_ICONS.length}
          </span>
        </div>

        <ul className="wish-icon-grid" role="radiogroup" aria-label="아이콘 선택">
          {GROUP_ICONS.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="radio"
                aria-checked={icon === name}
                aria-label={name}
                className={`wish-icon-btn${icon === name ? " is-selected" : ""}`}
                onClick={() => setIcon(name)}
              >
                <WishIcon name={name} />
              </button>
            </li>
          ))}
        </ul>

        <div className="wish-modal-actions">
          <button type="button" className="wish-btn wish-btn--gray" onClick={onCloseNewGroup}>
            취소
          </button>
          <button type="submit" className="wish-btn wish-btn--white" disabled={!name.trim() || busy}>
            만들기
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ---------- 토스트 ----------
const Toast = () => {
  const navigate = useNavigate();
  const { toast, onCloseToast, onClosePicker } = useHeartStore();

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onCloseToast, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, onCloseToast]);

  if (!toast) return null;

  return createPortal(
    <div className="wish-toast" role="status" aria-live="polite">
      <span className="wish-toast-icon">
        <WishIcon name="heart" />
      </span>
      <p>{toast.text}</p>
      {toast.groupId && (
        <button
          type="button"
          className="wish-toast-link"
          onClick={() => {
            onCloseToast();
            onClosePicker();
            navigate(`/wishlist?group=${toast.groupId}`);
          }}
        >
          그룹으로 이동
        </button>
      )}
    </div>,
    document.body
  );
};

const WishlistLayer = () => {
  const uid = useAuthStore((s) => s.user?.uid || null);
  const onConnect = useHeartStore((s) => s.onConnect);
  const pickerKey = useHeartStore((s) => s.pickerKey);
  const newGroupOpen = useHeartStore((s) => s.newGroupOpen);

  // 로그인 / 로그아웃 할 때 계정의 위시리스트 연결
  useEffect(() => {
    onConnect(uid);
  }, [uid, onConnect]);

  return (
    <>
      {pickerKey && !newGroupOpen && <GroupPicker />}
      {newGroupOpen && <NewGroup />}
      <Toast />
    </>
  );
};

export default WishlistLayer;
