import React from 'react';
import { footerMainLinks, footerSubLinks } from '../../data/footerData';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="inner">

        {/* 1. 상단 주요 링크 (가로 한 줄, › 포함) */}
        <ul className="footer-main-menu">
          {footerMainLinks.map((item, index) => (
            <li key={index}>
              <a href={item.path}>
                {item.label} <span className="arrow" aria-hidden="true">›</span>
              </a>
            </li>
          ))}
        </ul>

        {/* 2. tv 로고 */}
        <div className="footer-logo">
          <img src="/icons/header-icon.svg" alt="Apple TV" />
        </div>

        {/* 3. 정책 링크 + 국가/언어 */}
        <div className="footer-sub-nav">
          <ul className="footer-policy-menu">
            {footerSubLinks.map((item, index) => (
              <li key={index}>
                <a href={item.path}>{item.label}</a>
              </li>
            ))}
          </ul>
          <div className="footer-region">대한민국 · 한국어</div>
        </div>

        {/* 4. 저작권 */}
        <div className="footer-copyright">
          Copyright &copy; {new Date().getFullYear()} Apple Inc. 모든 권리 보유.
        </div>

      </div>
    </footer>
  );
};

export default Footer;
