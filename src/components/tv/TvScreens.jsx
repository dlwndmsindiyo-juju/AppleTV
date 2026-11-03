import React, { useState } from "react";

// TV 디자인 화면 (1920 × 1080) — 스타일: TV.scss
// - TvTerms   : Apple TV 이용 안내 (동의 / 취소)
// - TvKeyboard: Apple 계정 로그인 (암호) · 계정 정보 입력 — 리모컨 자판
// - 버튼 동작은 props 로 받음 (미리보기 화면 TvPreview.jsx 에서 다음 / 이전 화면으로 연결)

// ---------- 이용 안내 ----------
export const TvTerms = ({ onAgree, onCancel }) => (
  <main className="tv-screen tv-terms">
    <h1 className="tv-title tv-title--xl">Apple TV 이용 안내</h1>
    <p className="tv-desc">
      Apple TV에서 콘텐츠를 시청하려면 Apple 계정으로 로그인하세요. 구독 및 시청 가능 여부는 계정과 콘텐츠에 따라
      달라집니다. 개인정보와 계정 설정은 언제든지 변경할 수 있습니다.
    </p>

    <div className="tv-actions">
      <button type="button" className="tv-btn tv-btn--primary" data-tv-autofocus onClick={onAgree}>
        동의
      </button>
      <button type="button" className="tv-btn tv-btn--secondary" onClick={onCancel}>
        취소
      </button>
    </div>
  </main>
);

// ---------- 리모컨 자판 ----------
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMBERS = "1234567890".split("");
const LOGIN_SECOND_ROW = "1234567890.-_!@#$%^&*".split(""); // 로그인 시안: 숫자 + 특수문자 한 줄
const SYMBOLS = ".-_!@#$%^&*~+=()[]{}?/:;".split("");

// 모드별로 보여줄 자판 줄
// - login  : 1줄 글자(ABC 대문자 · abc 소문자 · #+- 특수문자) + 2줄 숫자 · 특수문자 (모드 3칸)
// - account: 1줄만 (ABC 대문자 · abc 소문자 · 123 숫자 · #+- 특수문자) (모드 4칸)
const rowsFor = (variant, mode) => {
  const first =
    mode === "ABC" ? LETTERS.map((c) => c.toUpperCase())
      : mode === "123" ? NUMBERS
        : mode === "#+-" ? SYMBOLS
          : LETTERS;

  return variant === "login" ? [first, LOGIN_SECOND_ROW] : [first];
};

const MODES = {
  login: ["ABC", "abc", "#+-"],
  account: ["ABC", "abc", "123", "#+-"],
};

const COPY = {
  login: {
    title: "Apple 계정으로 로그인",
    desc: (
      <>
        사용 중인 Apple 계정의 암호를 입력하세요.
        <br />
        계정 정보는 안전하게 보호됩니다.
      </>
    ),
  },
  account: {
    title: "계정 정보 입력",
    desc: "네트워크 연결을 확인한 후 다시 시도해주세요.",
  },
};

const GUIDE = "리모컨의 마이크 버튼을 길게 눌러 검색";

// variant: "login" (암호 · 입력값은 ● 로 가림) / "account"
export const TvKeyboard = ({ variant = "login", onCancel, onSubmit }) => {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState(variant === "login" ? "abc" : "ABC");

  const rows = rowsFor(variant, mode);
  const modes = MODES[variant];
  const copy = COPY[variant];
  const shown = variant === "login" ? "●".repeat(value.length) : value;

  const add = (char) => setValue((v) => v + char);
  const remove = () => setValue((v) => v.slice(0, -1));

  return (
    <main className="tv-screen tv-keyboard">
      <h1 className="tv-title tv-title--xl">{copy.title}</h1>
      <p className="tv-desc">{copy.desc}</p>

      {/* 입력 전: 리모컨 안내 / 입력 후: 입력한 글자 (암호는 ●) */}
      <p className={`tv-guide${value ? " has-value" : ""}`} aria-live="polite">
        {value ? shown : GUIDE}
      </p>

      <div className="tv-keys">
        {rows.map((row, rowIndex) => (
          <div className="tv-key-row" key={rowIndex}>
            {rowIndex === 0 && (
              <button type="button" className="tv-key-space" onClick={() => add(" ")}>
                공백
              </button>
            )}

            {row.map((char) => (
              <button type="button" className="tv-key" key={char} onClick={() => add(char)}>
                {char}
              </button>
            ))}

            {rowIndex === 0 && (
              <button type="button" className="tv-key tv-key--delete" aria-label="지우기" onClick={remove}>
                <img src="/icons/tv/tv-delet-btn.svg" alt="" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={`tv-key-modes${modes.length === 4 ? " tv-key-modes--4" : ""}`} role="group" aria-label="자판 종류">
        {modes.map((m) => (
          <button
            type="button"
            key={m}
            className={`tv-key-mode${m === mode ? " is-active" : ""}`}
            aria-pressed={m === mode}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="tv-actions">
        {variant === "login" ? (
          <>
            <button type="button" className="tv-btn tv-btn--secondary" onClick={onCancel}>
              취소
            </button>
            <button type="button" className="tv-btn tv-btn--secondary" data-tv-autofocus onClick={() => onSubmit?.(value)}>
              로그인
            </button>
          </>
        ) : (
          <button type="button" className="tv-btn tv-btn--secondary" data-tv-autofocus onClick={() => onSubmit?.(value)}>
            계속
          </button>
        )}
      </div>
    </main>
  );
};
