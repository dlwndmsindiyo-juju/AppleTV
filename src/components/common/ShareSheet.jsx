// src/components/common/ShareSheet.jsx
// [추가] 공유 팝업 — 시안: 공유 (어두운 팝업 · 아이콘 5개 · 주소 칸 + [링크 복사] · 안내 문구)
// - 열기: utils/share.js 의 openShare({ title, url }) · App.jsx 에 한 번만 둠
// - 아이콘: public/icons/share/ (message · kakao · facebook · x · email)
// - 메시지: 휴대폰 문자 앱 · 카카오톡: Kakao SDK (VITE_KAKAO_JS_KEY 가 있을 때) → 없으면 기기 공유 창 → 그것도 없으면 링크 복사
// - Facebook · X: 각 서비스 공유 창(새 창) · 이메일: 메일 앱
// - 닫기: × · 바깥 어두운 곳 · Esc / 열려 있는 동안 뒤 화면 스크롤 막음
// - 스타일: components/common/ShareSheet.scss
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SHARE_EVENT } from "../../utils/share";
import "./ShareSheet.scss"; // [수정] 공유 팝업 스타일 (App.scss 에서 분리)

const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY;
const KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const GUIDE = "공유할 앱을 선택하거나 링크를 복사해 주세요.";

let kakaoLoading = null;
const loadKakao = () => {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (!kakaoLoading) {
    kakaoLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = KAKAO_SDK;
      s.async = true;
      s.onload = () => resolve(window.Kakao);
      s.onerror = () => {
        kakaoLoading = null;
        reject(new Error("kakao sdk"));
      };
      document.head.appendChild(s);
    });
  }
  return kakaoLoading;
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 클립보드 권한이 없는 브라우저: 임시 입력칸으로 복사
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
};

const openWindow = (href) => window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");

const ShareSheet = () => {
  const [data, setData] = useState(null); // { title, url } | null
  const [message, setMessage] = useState(GUIDE);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef(null);

  const close = useCallback(() => setData(null), []);

  // openShare() 로 열기
  useEffect(() => {
    const onOpen = (e) => {
      setData(e.detail);
      setMessage(GUIDE);
      setCopied(false);
    };
    window.addEventListener(SHARE_EVENT, onOpen);
    return () => window.removeEventListener(SHARE_EVENT, onOpen);
  }, []);

  // 열려 있는 동안: Esc 로 닫기 · 뒤 화면 스크롤 막기 · 닫기 버튼에 포커스
  useEffect(() => {
    if (!data) return undefined;
    const onKey = (e) => e.key === "Escape" && close();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [data, close]);

  if (!data) return null;
  const { title, url } = data;
  const enc = encodeURIComponent;
  const text = title ? `${title} ${url}` : url;

  const copyLink = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    setMessage(ok ? "링크가 복사되었어요." : "링크를 복사하지 못했어요. 주소를 길게 눌러 직접 복사해 주세요.");
  };

  const shareKakao = async () => {
    if (KAKAO_KEY) {
      try {
        const Kakao = await loadKakao();
        if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
        // 사이트 주소의 미리보기(제목 · 이미지)를 카카오톡 메시지로 — Kakao Developers 에 사이트 도메인 등록 필요
        if (Kakao?.Share?.sendScrap) {
          Kakao.Share.sendScrap({ requestUrl: url });
          return;
        }
      } catch {
        // SDK 를 못 불러오면 아래로
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, url }); // 휴대폰: 기기 공유 창에서 카카오톡 선택
      } catch {
        // 공유 취소 무시
      }
      return;
    }
    const ok = await copyText(url);
    setCopied(ok);
    setMessage(ok ? "링크를 복사했어요. 카카오톡 대화창에 붙여 넣어 주세요." : "링크를 복사하지 못했어요.");
  };

  const targets = [
    { key: "message", label: "메시지", onClick: () => (window.location.href = `sms:?&body=${enc(text)}`) },
    { key: "kakao", label: "카카오톡", onClick: shareKakao },
    { key: "facebook", label: "Facebook", onClick: () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`) },
    { key: "x", label: "X", onClick: () => openWindow(`https://twitter.com/intent/tweet?text=${enc(title || "")}&url=${enc(url)}`) },
    { key: "email", label: "이메일", onClick: () => (window.location.href = `mailto:?subject=${enc(title || "")}&body=${enc(url)}`) },
  ];

  return (
    <div className="share-dim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        {/* [수정] <header> → <div>: 사이트 상단 헤더 스타일(App.scss header { position: fixed … })이 같이 걸려서 제목 줄이 위에 붙고 검정 띠가 생겼음 */}
        <div className="share-head">
          <h2 id="share-title">공유</h2>
          {/* [수정] 닫기 아이콘: public/icons/close.svg (App.scss .share-close-icon · 흰색 mask) */}
          <button type="button" className="share-close" onClick={close} aria-label="닫기" ref={closeRef}>
            <span className="share-close-icon" aria-hidden="true" />
          </button>
        </div>

        <ul className="share-targets">
          {targets.map((t) => (
            <li key={t.key}>
              <button type="button" className="share-target" onClick={t.onClick}>
                <span className="share-target-icon" aria-hidden="true">
                  <img src={`/icons/share/${t.key}.svg`} alt="" />
                </span>
                <span className="share-target-label">{t.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="share-link">
          <span className="share-url" title={url}>{url}</span>
          <button type="button" className={`share-copy${copied ? " is-done" : ""}`} onClick={copyLink}>
            {copied ? "복사됨" : "링크 복사"}
          </button>
        </div>

        <p className="share-guide" role="status" aria-live="polite">
          {message}
        </p>
      </section>
    </div>
  );
};

export default ShareSheet;
