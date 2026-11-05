import React, { useState } from "react";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";
import { MANAGE_URL } from "../../data/appleLinks";
import "../../subscribe.scss";

/**
 * 무료 체험 중인 사용자에게만 홈 상단에 보이는 안내 (시안 4)
 * - 체험 상태 띠(하얀 배너)만 (메인 홈 맨 위)
 * - 하얀 배너: "하루 안 보기"(24시간) / "일주일 안 보기"(7일) → 누른 시점부터 그 기간 동안 숨김
 *   계정(uid)별로 이 브라우저(localStorage)에 숨김 종료 시각을 저장
 * - [삭제] 첫 구독 후 환영 화면(문구 · TOP 10 · 홈으로 바로가기) — 로그인하면 바로 메인 홈
 */
const HOUR_MS = 60 * 60 * 1000;
const HIDE_OPTIONS = [
  { key: "day", label: "하루 안 보기", ms: 24 * HOUR_MS },
  { key: "week", label: "일주일 안 보기", ms: 7 * 24 * HOUR_MS },
];

const hideKey = (uid) => `trialStripHideUntil:${uid || "guest"}`;

const readHideUntil = (uid) => {
  try {
    return Number(localStorage.getItem(hideKey(uid))) || 0;
  } catch {
    return 0;
  }
};

const saveHideUntil = (uid, until) => {
  try {
    localStorage.setItem(hideKey(uid), String(until));
  } catch {
    /* 저장 불가 환경이면 이번 화면에서만 숨김 */
  }
};

const isTrialUser = (user) => isSubscribed(user) && user?.subscription?.status === "trial";

const TrialWelcome = () => {
  const { user, authReady } = useAuthStore();
  const uid = user?.uid;
  const [hideUntil, setHideUntil] = useState(() => readHideUntil(uid));

  // 계정이 바뀌면 그 계정의 숨김 기록을 다시 읽음
  const [lastUid, setLastUid] = useState(uid);
  if (uid !== lastUid) {
    setLastUid(uid);
    setHideUntil(readHideUntil(uid));
  }

  if (!authReady || !isTrialUser(user)) {
    return null;
  }

  // 배너를 숨겼으면 섹션 자체를 그리지 않음
  if (Date.now() < hideUntil) return null;

  const hideFor = (ms) => {
    const until = Date.now() + ms;
    saveHideUntil(uid, until);
    setHideUntil(until);
  };

  return (
    <section className="trial-welcome">
      <div className="inner">
          <div className="trial-strip">
            <p className="trial-strip-title">
              <span className="ui-icon ui-icon-check" aria-hidden="true" /> Apple TV 무료 체험 중
            </p>
            <div className="trial-strip-actions">
              {HIDE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className="trial-strip-hide"
                  onClick={() => hideFor(opt.ms)}
                >
                  {opt.label}
                </button>
              ))}
              <a className="trial-strip-link" href={MANAGE_URL} target="_blank" rel="noreferrer">
                구독 관리
              </a>
            </div>
          </div>
      </div>
    </section>
  );
};

export default TrialWelcome;
