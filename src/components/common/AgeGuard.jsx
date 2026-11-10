// src/components/common/AgeGuard.jsx
// [추가] 미성년자 계정: 청소년 관람불가 콘텐츠 흐림 + 누르면 안내 팝업 — App.jsx 에 한 번만 둠
// - 화면의 작품 링크(/movie/:id · /tv/:id · /search/title/:type/:id · /detail/:id)를 찾아 등급 확인 (utils/ageRating.js)
//   → 청소년 관람불가면 링크에 data-age-blocked 표시 → 포스터 · 이미지 흐림 (App.scss)
// - 표시된 링크를 누르면 이동하지 않고 "청소년 관람불가" 팝업
// - 링크가 아닌 버튼(히어로 재생 등)이나 주소를 직접 입력해 상세로 들어와도: 상세 화면 위에 팝업 → [확인] 을 누르면 이전 화면(없으면 홈)으로
// - 팝업 디자인: 공유 · 신고 팝업과 같은 틀 (ShareSheet.scss)
// - 생년월일이 없거나 성인인 계정 · 로그아웃 상태에서는 아무것도 하지 않음
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { fetchIsAdult, isMinorUser, knownAdult, parseContentPath } from "../../utils/ageRating";
import "./ShareSheet.scss";

const ATTR = "data-age-blocked";
const CHECKED = "data-age-checked";

const AgeGuard = () => {
  const user = useAuthStore((s) => s.user);
  const minor = isMinorUser(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [popup, setPopup] = useState(null); // { leave: boolean } | null
  const okRef = useRef(null);

  // ---------- 1. 작품 링크 흐림 ----------
  useEffect(() => {
    const clearAll = () => {
      document.querySelectorAll(`[${ATTR}], [${CHECKED}]`).forEach((el) => {
        el.removeAttribute(ATTR);
        el.removeAttribute(CHECKED);
      });
    };
    if (!minor) {
      clearAll();
      return undefined;
    }

    const mark = (a) => {
      const href = a.getAttribute("href");
      if (!href || a.getAttribute(CHECKED) === href) return;
      a.setAttribute(CHECKED, href); // 같은 주소는 한 번만 확인 (링크가 다른 작품으로 바뀌면 다시)
      a.removeAttribute(ATTR);
      const target = parseContentPath(href);
      if (!target) return;
      const apply = (adult) => {
        if (a.getAttribute("href") !== href) return;
        if (adult) a.setAttribute(ATTR, "");
      };
      const known = knownAdult(target.type, target.id);
      if (known !== undefined) apply(known);
      else fetchIsAdult(target.type, target.id).then(apply);
    };

    const scan = (root = document) => {
      if (root.nodeType !== 1 && root !== document) return;
      if (root.matches?.("a[href]")) mark(root);
      root.querySelectorAll?.("a[href]").forEach(mark);
    };

    scan();
    const mo = new MutationObserver((list) => {
      list.forEach((m) => {
        if (m.type === "attributes") mark(m.target);
        else m.addedNodes.forEach((n) => scan(n));
      });
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return () => {
      mo.disconnect();
      clearAll();
    };
  }, [minor]);

  // ---------- 2. 흐린 링크를 누르면 이동하지 않고 팝업 ----------
  useEffect(() => {
    if (!minor) return undefined;
    const onClick = (e) => {
      const a = e.target.closest?.(`a[${ATTR}]`);
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      setPopup({ leave: false });
    };
    document.addEventListener("click", onClick, true); // 링크의 onClick · 라우터 이동보다 먼저
    return () => document.removeEventListener("click", onClick, true);
  }, [minor]);

  // ---------- 3. 상세 화면으로 바로 들어온 경우 ----------
  useEffect(() => {
    if (!minor) return undefined;
    const target = parseContentPath(location.pathname + location.search);
    if (!target) return undefined;
    let alive = true;
    fetchIsAdult(target.type, target.id).then((adult) => {
      if (alive && adult) setPopup({ leave: true });
    });
    return () => {
      alive = false;
    };
  }, [minor, location.pathname, location.search]);

  const close = useCallback(() => {
    const leave = popup?.leave;
    setPopup(null);
    if (leave) {
      if (location.key !== "default") navigate(-1);
      else navigate("/", { replace: true });
    }
  }, [popup, location.key, navigate]);

  // 열려 있는 동안: Esc 로 닫기 · 뒤 화면 스크롤 막기 · [확인] 에 포커스
  useEffect(() => {
    if (!popup) return undefined;
    const onKey = (e) => e.key === "Escape" && close();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    okRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [popup, close]);

  if (!popup) return null;

  return createPortal(
    <div className={`share-dim age-gate-dim${popup.leave ? " is-cover" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="share-modal age-gate-modal" role="alertdialog" aria-modal="true" aria-labelledby="age-gate-title" aria-describedby="age-gate-desc">
        <span className="age-gate-badge" aria-hidden="true">19</span>
        <h2 id="age-gate-title" className="age-gate-title">청소년 관람불가</h2>
        <p id="age-gate-desc" className="age-gate-desc">
          이 콘텐츠는 청소년 관람불가 등급으로
          <br />
          만 19세 미만은 이용할 수 없어요.
        </p>
        <button type="button" className="age-gate-ok" onClick={close} ref={okRef}>
          확인
        </button>
      </section>
    </div>,
    document.body,
  );
};

export default AgeGuard;
