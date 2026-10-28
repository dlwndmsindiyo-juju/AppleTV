import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";
import Top10Section from "./Top10Section";
import { MANAGE_URL } from "../../data/appleLinks";
import "../../subscribe.scss";

/**
 * 무료 체험 중인 사용자에게만 홈 상단에 보이는 안내 (시안 4)
 * - 체험 상태 띠(하얀 배너) + "지금부터, 마음껏 즐겨보세요." 문구
 * - 하얀 배너: "하루 안 보기"(24시간) / "일주일 안 보기"(7일) → 누른 시점부터 그 기간 동안 숨김
 *   계정(uid)별로 이 브라우저(localStorage)에 숨김 종료 시각을 저장
 * - 첫 구독(무료 체험) 후 처음 들어오면 "환영 화면"만 보여줌
 *   문구 아래 TOP 10 슬라이드 + "홈으로 바로가기" → 누르면 메인 홈 전체가 열림 (계정별로 1번만)
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

// 환영 화면을 이미 지나갔는지 (계정별, 이 브라우저)
const introKey = (uid) => `trialIntroDone:${uid || "guest"}`;

const readIntroDone = (uid) => {
  try {
    return localStorage.getItem(introKey(uid)) === "1";
  } catch {
    return false;
  }
};

const saveIntroDone = (uid) => {
  try {
    localStorage.setItem(introKey(uid), "1");
  } catch {
    /* 저장 불가 환경이면 새로고침 시 환영 화면이 다시 나옴 */
  }
};

const isTrialUser = (user) => isSubscribed(user) && user?.subscription?.status === "trial";

// MemberHome 에서 사용: 환영 화면을 보여줄지 + 홈으로 넘어가기
// const { showIntro, enterHome } = useTrialIntro();
export const useTrialIntro = () => {
  const { user, authReady } = useAuthStore();
  const uid = user?.uid;
  const [doneUid, setDoneUid] = useState(null); // 이번 화면에서 방금 넘어간 계정

  const showIntro = authReady && isTrialUser(user) && doneUid !== uid && !readIntroDone(uid);

  const enterHome = () => {
    saveIntroDone(uid);
    setDoneUid(uid);
  };

  return { showIntro, enterHome };
};

const TrialWelcome = ({ intro = false, onEnterHome }) => {
  const navigate = useNavigate();
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

  const stripHidden = Date.now() < hideUntil;

  // 메인 홈에서는 하얀 배너만 보여주므로, 배너를 숨겼으면 섹션 자체를 그리지 않음
  if (!intro && stripHidden) return null;

  const hideFor = (ms) => {
    const until = Date.now() + ms;
    saveHideUntil(uid, until);
    setHideUntil(until);
  };

  // 홈으로 바로가기: 환영 화면을 닫고 메인 홈 맨 위로
  const goHome = () => {
    onEnterHome?.();
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      className={`trial-welcome${stripHidden ? " is-strip-hidden" : ""}${intro ? " is-intro" : ""}`}
    >
      <div className="inner">
        {!stripHidden && (
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
        )}
        {intro && (
          <>
            <h2 className="trial-heading">지금부터, 마음껏 즐겨보세요.</h2>
            <p className="trial-sub">새로운 Apple Original과 기다렸던 이야기를 만나보세요.</p>
          </>
        )}
      </div>

      {intro && (
        <>
          {/* 문구 아래: TOP 10 슬라이드 (메인 홈 TOP 10 과 같은 컴포넌트) */}
          <Top10Section title="지금 인기 있는 TOP 10" />

          <div className="inner trial-home-actions">
            <button type="button" className="trial-home-link" onClick={goHome}>
              홈으로 바로가기
              <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default TrialWelcome;
