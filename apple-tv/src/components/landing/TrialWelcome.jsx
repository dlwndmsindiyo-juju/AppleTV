import React from "react";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";
import { MANAGE_URL } from "../../data/appleLinks";
import "../../subscribe.scss";

/**
 * 무료 체험 중인 사용자에게만 홈 상단에 보이는 안내 (시안 4)
 * - 체험 상태 띠 + "지금부터, 마음껏 즐겨보세요." 문구
 */
const TrialWelcome = () => {
  const { user, authReady } = useAuthStore();

  if (!authReady || !isSubscribed(user) || user?.subscription?.status !== "trial") {
    return null;
  }

  return (
    <section className="trial-welcome">
      <div className="inner">
        <div className="trial-strip">
          <p className="trial-strip-title">
            <span aria-hidden="true">✓</span> Apple TV 무료 체험 중
          </p>
          <a className="trial-strip-link" href={MANAGE_URL} target="_blank" rel="noreferrer">
            구독 관리
          </a>
        </div>
        <h2 className="trial-heading">지금부터, 마음껏 즐겨보세요.</h2>
        <p className="trial-sub">새로운 Apple Original과 기다렸던 이야기를 만나보세요.</p>
      </div>
    </section>
  );
};

export default TrialWelcome;
