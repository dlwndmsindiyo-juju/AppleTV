import React, { useEffect, useRef, useState } from "react";

// [추가] TV 상세 · 영상 끝 화면 공용 버튼 (시청하기 · 관심 · 정보) — 스타일: TV.scss (.tv-end-actions …)
// - 버튼 142 × 80 (패딩 18 56) · 선택(포커스) Primary · 기본 Dark/300
// - 버튼 아래 글자 SF Pro Medium 23 / 36 · Dark/200 (선택: Light/0)
// - actions: [{ key, label, icon, onClick, pressed }] · 첫 버튼이 처음 선택된 상태
// - focusOn: 값이 바뀔 때마다 첫 버튼에 포커스 (예: 영상 id)
export const TvActionButtons = ({ actions, focusOn, className = "" }) => {
  const firstRef = useRef(null);
  const [focusKey, setFocusKey] = useState(actions[0]?.key);

  useEffect(() => {
    setFocusKey(actions[0]?.key);
    if (focusOn !== undefined) firstRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOn]);

  return (
    <div className={`tv-end-actions ${className}`.trim()}>
      {actions.map((a, i) => (
        <div key={a.key} className={`tv-end-action${focusKey === a.key ? " is-active" : ""}`}>
          <button
            type="button"
            ref={i === 0 ? firstRef : undefined}
            className="tv-end-btn"
            aria-label={a.label}
            aria-pressed={a.pressed}
            data-tv-autofocus={i === 0 || undefined}
            onFocus={() => setFocusKey(a.key)}
            onClick={a.onClick}
          >
            {a.icon}
          </button>
          <span className="tv-end-action-label">{a.label}</span>
        </div>
      ))}
    </div>
  );
};

// 버튼 아이콘
export const PlayIcon = () => <img className="tv-end-play" src="/icons/play-w.svg" alt="" aria-hidden="true" />;
export const PlusIcon = ({ on = false }) => <span className={`tv-end-plus${on ? " is-on" : ""}`} aria-hidden="true" />;
export const TextIcon = ({ children }) => <span className="tv-end-btn-text">{children}</span>;

// 관심 경기 (이 기기에 저장) — [수정] 보관함 "스포츠" 에 보여주려고 제목 · 이미지도 같이 저장
// - 저장 모양: [{ id, title, image, label, prefix, desc, videoId }] (예전 저장값: 영상 id 문자열)
const INTEREST_KEY = "tv-interest-videos";
const entryId = (v) => (typeof v === "string" ? v : v?.id);
export const readInterest = () => {
  try {
    return JSON.parse(localStorage.getItem(INTEREST_KEY) || "[]");
  } catch {
    return [];
  }
};

// meta: 담을 때 같이 저장할 정보 { title, image, label, prefix, desc, videoId }
export const useInterest = (id, meta = {}) => {
  const [list, setList] = useState(readInterest);
  const saved = Boolean(id) && list.some((v) => entryId(v) === id);
  const toggle = () => {
    if (!id) return;
    const next = saved ? list.filter((v) => entryId(v) !== id) : [...list, { id, ...meta, addedAt: Date.now() }];
    setList(next);
    try {
      localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
    } catch {
      /* 저장 공간 없음: 화면에서만 반영 */
    }
  };
  return { saved, toggle };
};
