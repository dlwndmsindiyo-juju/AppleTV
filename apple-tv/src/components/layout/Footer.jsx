import React from 'react';
import { footerMainLinks, footerSubLinks } from '../../data/footerData';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="inner">

        {/* 1. 상단 로고 영역 */}
        <div className="footer-logo">
          <span><img src="/icons/header-icon.svg" alt="" /></span>
        </div>

        {/* 2. 주요 링크 메뉴 영역 (오른쪽 화살표 포함) */}
        <ul className="footer-main-menu">
          {footerMainLinks.map((item, index) => (
            <li key={index}>
              <a href={item.path}>
                {item.label} <span className="arrow">&gt;</span>
              </a>
            </li>
          ))}
        </ul>

        {/* 3. 부가 정책 및 국가 설정 영역 */}
        <div className="footer-sub-nav">
          <ul className="footer-policy-menu">
            {footerSubLinks.map((item, index) => (
              <li key={index}>
                <a href={item.path}>{item.label}</a>
              </li>
            ))}
          </ul>
          <div className="footer-region">
            대한민국 · 한국어
          </div>
        </div>

        {/* 4. 저작권 영역 */}
        <div className="footer-copyright">
          Copyright &copy; {new Date().getFullYear()} Apple Inc. 모든 권리 보유.
        </div>

      </div>
    </footer>
  );
};

export default Footer;