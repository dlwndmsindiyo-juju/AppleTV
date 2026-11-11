import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // [추가] 사이트 안 주소(/faq 등)는 새로고침 없이 이동
import { footerMainLinks, footerSubLinks } from '../../data/footerData';

// [추가] 도움말 페이지(이용 가이드 · FAQ · 지원)에서 "돌아가기"로 돌아올 곳 = 푸터 메뉴를 누를 때 보던 페이지 + 스크롤 위치
// - 이미 도움말 페이지 안이면 처음 들어오기 전 페이지를 그대로 넘김 (도움말끼리 오가도 돌아갈 곳은 그대로)
// [수정] 정책 페이지(개인정보 · 이용약관 · 환불)도 같은 방식 — 서로 오가도 처음 보던 페이지는 그대로
const HELP_PATHS = ['/guide', '/faq', '/support', '/privacy', '/terms', '/refund'];

const Footer = () => {
  const location = useLocation();
  const inHelp = HELP_PATHS.includes(location.pathname);
  const returnTo = inHelp
    ? location.state?.returnTo
    : { path: `${location.pathname}${location.search}${location.hash}`, scrollY: 0 };

  return (
    <footer className="footer">
      <div className="inner">

        {/* 1. tv 로고 (맨 위) */}
        <div className="footer-logo">
          <img src="/icons/header-icon.svg" alt="Apple TV" />
        </div>

        {/* 2. 주요 링크 (가로 한 줄, › 포함) */}
        <ul className="footer-main-menu">
          {footerMainLinks.map((item, index) => (
            <li key={index}>
              {item.path.startsWith('/') ? (
                <Link
                  to={item.path}
                  // [추가] 보던 페이지 · 스크롤 위치 (누르는 순간의 위치)
                  state={{ returnTo }}
                  onClick={() => { if (returnTo && !inHelp) returnTo.scrollY = window.scrollY; }}
                >
                  {item.label} <img className="arrow ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
                </Link>
              ) : (
                <a href={item.path}>
                  {item.label} <img className="arrow ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>

        {/* 3. 정책 링크 + 국가/언어 (한 줄) */}
        <ul className="footer-policy-menu">
          {footerSubLinks.map((item, index) => (
            <li key={index}>
              {/* [수정] 사이트 안 정책 페이지(/privacy · /terms)는 새로고침 없이 이동 · 바깥 주소는 그대로 */}
              {/* [수정] 보던 페이지 · 스크롤 위치를 넘김 → 정책 페이지 "돌아가기" */}
              {item.path.startsWith('/') ? (
                <Link
                  to={item.path}
                  state={{ returnTo }}
                  onClick={() => { if (returnTo && !inHelp) returnTo.scrollY = window.scrollY; }}
                >
                  {item.label}
                </Link>
              ) : <a href={item.path}>{item.label}</a>}
            </li>
          ))}
          <li className="footer-region">대한민국 · 한국어</li>
        </ul>

        {/* 4. 저작권 */}
        <div className="footer-copyright">
          Copyright &copy; Apple Inc. 모든 권리 보유.
        </div>

        {/* [추가] 5. 사업자 정보 */}
        <p className="footer-business">
          Apple Services Pte. Ltd. | 대표이사: Christopher John Jenkinson | 주소: Ang Mo Kio Street 64, Singapore 569086 | 전화: 080-333-4000 | 사업자등록번호: 251-84-00063 | 통신판매업신고번호: 제2024-서울강남-06040호 | 호스팅 서비스 제공: Apple Inc.
        </p>

      </div>
    </footer>
  );
};

export default Footer;
