import React, { useEffect, useId, useRef, useState } from "react";

// [추가] 선택 상자 공용 — 지불 방법 등록 팝업(Subscribe.jsx Dropdown)과 같은 디자인 · 같은 동작
// - 스타일: App.scss .sub-select (목록은 아래 내용을 밀지 않고 그 위에 덮임)
//   · variant="line": 상자 테두리 · 배경 없이 아래 선(border-bottom)만 (작품 상세 에피소드 정렬)
// - options: [{ value, label }] · 값은 문자열 · 숫자 모두 가능
// - 키보드: ↓ 열기 · ↑↓ 이동 · Esc 닫기 · Tab 닫기 / 바깥을 누르면 닫힘
const SelectDropdown = ({ value, onChange, options, ariaLabel, disabled, variant, className = "" }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) || options[0];

  // 바깥을 누르면 닫기 · 열리면 고른 항목으로 포커스
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    const items = listRef.current?.querySelectorAll(".sub-select-option");
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    items?.[idx]?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const focusTrigger = () => boxRef.current?.querySelector(".sub-select-trigger")?.focus();

  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
    focusTrigger();
  };

  const onListKey = (e) => {
    const items = [...(listRef.current?.querySelectorAll(".sub-select-option") || [])];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      focusTrigger();
    }
    if (e.key === "Tab") setOpen(false);
  };

  const classes = [
    "sub-select",
    variant ? `sub-select--${variant}` : "",
    open ? "is-open" : "",
    disabled ? "is-disabled" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div ref={boxRef} className={classes}>
      <button
        type="button"
        className="sub-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ? `${ariaLabel}: ${current?.label ?? ""}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); }
          if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }}
      >
        <span className="sub-select-value">{current?.label}</span>
      </button>
      {open && (
        <ul ref={listRef} id={listId} className="sub-select-list" role="listbox" aria-label={ariaLabel} onKeyDown={onListKey}>
          {options.map((o) => (
            <li key={String(o.value)} role="presentation">
              <button type="button" role="option" aria-selected={o.value === value} className="sub-select-option" onClick={() => pick(o)}>
                <span>{o.label}</span>
                {o.value === value && <span className="sub-select-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SelectDropdown;
