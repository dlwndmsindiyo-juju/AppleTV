import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TvTerms, TvKeyboard, isTvAccount } from "../components/tv/TvScreens";
import TvSportHome from "../components/tv/TvSportHome";
import TvHome from "../components/tv/TvHome";
import "../TV.scss";

// TV 디자인 미리보기 (/tv) — 하단 TV 버튼(FloatingActions)으로 들어옴
// - 위쪽 탭: 이용 안내 → Apple 계정 로그인 → 계정 정보 입력 · 홈 · 스포츠 (탭으로 바로 골라 보기)
// - 화면 버튼도 순서대로 연결: 동의 → 로그인 / 로그인 → 계정 정보 입력 / 계속 → 처음(이용 안내)
//   취소: 이용 안내 → 웹 화면으로 돌아가기 · 로그인 → 이용 안내
// - TV 화면이 창 전체를 꽉 채움 (테두리 · 바깥 여백 없음)
//   · 가로 1920 기준으로 비율을 맞추고, 세로는 창 높이만큼 늘이거나 줄임
//   · 화면 탭은 아래쪽에 작게 띄워 둠
// - 리모컨처럼 방향키(← ↑ → ↓)로 버튼 사이를 이동 · Enter 로 누르기
// - 헤더 · 푸터 · 하단 배너 · 떠 있는 버튼은 App.jsx 에서 /tv 일 때 숨김

const TV_W = 1920;
const TV_H = 1080;

const TABS = [
  { id: "terms", label: "이용 안내" },
  { id: "login", label: "Apple 계정 로그인" },
  { id: "account", label: "계정 정보 입력" },
  { id: "home", label: "홈" },
  { id: "sport", label: "스포츠" },
];

// 방향키로 가장 가까운 버튼 찾기 (화면 위치 기준)
const findNext = (root, current, key) => {
  const buttons = [...root.querySelectorAll("button:not([disabled])")];
  if (!current || !buttons.includes(current)) return buttons[0];

  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;

  let best = null;
  let bestScore = Infinity;

  buttons.forEach((btn) => {
    if (btn === current) return;
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - fx;
    const dy = y - fy;

    const ok =
      (key === "ArrowRight" && dx > 1) ||
      (key === "ArrowLeft" && dx < -1) ||
      (key === "ArrowDown" && dy > 1) ||
      (key === "ArrowUp" && dy < -1);
    if (!ok) return;

    // 가는 방향 거리 + 옆으로 벗어난 거리(가중치)
    const main = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const side = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = main + side * 3;

    if (score < bestScore) {
      bestScore = score;
      best = btn;
    }
  });

  return best;
};

const TvPreview = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("terms");
  const [loginError, setLoginError] = useState(false); // [수정] 로그인 칸이 지정 계정과 다르면 계정 정보 입력 화면에 오류 안내
  const [scale, setScale] = useState(1);
  const [stageW, setStageW] = useState(TV_W);
  const [stageH, setStageH] = useState(TV_H);
  const areaRef = useRef(null);
  const stageRef = useRef(null);

  // 창 크기에 맞게 TV 화면 비율 계산
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return undefined;

    const update = () => {
      const { width, height } = area.getBoundingClientRect();
      // [수정] 1920 × 1080 이 창 안에 다 들어가는 비율로 맞추고, 남는 쪽(가로 또는 세로)은 화면을 늘려서 채움
      // → 창 전체를 빈틈없이 채우면서도 TV 화면이 1920 × 1080 보다 작아지지 않아 글자 · 버튼이 겹치지 않음
      const s = Math.min(width / TV_W, height / TV_H);
      setScale(s);
      setStageW(width / s);
      setStageH(height / s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(area);
    return () => ro.disconnect();
  }, []);

  // 화면이 바뀌면 시안에서 선택된 버튼에 포커스
  useEffect(() => {
    const stage = stageRef.current;
    const first = stage?.querySelector("[data-tv-autofocus]") || stage?.querySelector("button");
    first?.focus({ preventScroll: true });
  }, [tab]);

  // 리모컨 방향키
  const handleKeyDown = (e) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const stage = stageRef.current;
    if (!stage) return;
    e.preventDefault();
    const next = findNext(stage, document.activeElement, e.key);
    next?.focus({ preventScroll: true });
  };

  const exit = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="tv-preview">
      <div className="tv-preview-bar">
        <button type="button" className="tv-preview-exit" onClick={exit}>
          ← 웹 화면으로
        </button>

        <div className="tv-preview-tabs" role="tablist" aria-label="TV 화면">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tv-preview-tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tv-preview-area" ref={areaRef}>
        <div
          className="tv-preview-stage"
          ref={stageRef}
          role="tabpanel"
          style={{ width: stageW, height: stageH, transform: `scale(${scale})` }}
          onKeyDown={handleKeyDown}
        >
            {tab === "terms" && <TvTerms onAgree={() => setTab("login")} onCancel={exit} />}
            {tab === "login" && (
              <TvKeyboard
                key="login"
                variant="login"
                onCancel={() => setTab("terms")}
                onSubmit={(v) => {
                  setLoginError(!isTvAccount(v));
                  setTab("account");
                }}
              />
            )}
            {tab === "account" && <TvKeyboard key="account" variant="account" loginError={loginError} onSubmit={() => setTab("terms")} />}
            {tab === "home" && <TvHome onMenu={setTab} />}
            {tab === "sport" && <TvSportHome onMenu={setTab} />}
        </div>
      </div>
    </div>
  );
};

export default TvPreview;
