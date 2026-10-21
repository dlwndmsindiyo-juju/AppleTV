import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { loadLastTab } from "../components/layout/Header";
import {
  ECOSYSTEM_LINKS,
  ECOSYSTEM_ROWS,
  ECOSYSTEM_PRODUCTS,
  ECOSYSTEM_DEVICES,
} from "../data/ecosystemData";

// 공식 링크 버튼 (링크가 비어 있으면 비활성 버튼)
const ExternalButton = ({ href, className, children }) =>
  href ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <button type="button" className={className} disabled>
      {children}
    </button>
  );

// Apple TV 에코시스템 비교 페이지 (기기 안내 > 세 가지 차이 보기)
const Ecosystem = () => {
  // 들어오기 전 토글(Apple TV / Sport) 기준으로 돌아갈 홈 결정
  const homePath = loadLastTab() === "sport" ? "/sport" : "/";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="ecosystem-page page-fade">
      <div className="inner">
        <Link to={homePath} className="ecosystem-back">
          ‹ 홈으로 돌아가기
        </Link>

        {/* 상단 타이틀 (전역 header 스타일과 겹치지 않도록 div 사용) */}
        <div className="ecosystem-head">
          <p className="ecosystem-eyebrow">APPLE TV ECOSYSTEM</p>
          <h2 className="ecosystem-title">비슷한 이름. 다른 역할.</h2>
          <p className="ecosystem-lead">함께 연결되는 하나의 경험입니다.</p>
          <p className="ecosystem-desc">
            앱은 시청하는 공간, Apple TV는 콘텐츠 구독, Apple TV 4K는 TV에 연결하는
            기기입니다.
          </p>
        </div>

        {/* 3단 비교 카드 */}
        <div className="ecosystem-grid">
          {ECOSYSTEM_PRODUCTS.map((item) => (
            <article className="ecosystem-card" key={item.id}>
              <h3 className="ecosystem-card-name">{item.name}</h3>
              <p className="ecosystem-card-category">{item.category}</p>
              <p className="ecosystem-card-desc">
                {item.desc[0]}
                <br />
                {item.desc[1]}
              </p>

              <div className="ecosystem-card-image">
                <img src={item.image} alt={item.imageAlt} loading="lazy" />
              </div>

              <dl className="ecosystem-rows">
                {ECOSYSTEM_ROWS.map((row) => (
                  <div className="ecosystem-row" key={row.key}>
                    <dt>{row.label}</dt>
                    <dd>{item.rows[row.key]}</dd>
                  </div>
                ))}
              </dl>

              <ExternalButton
                className="ecosystem-btn"
                href={ECOSYSTEM_LINKS[item.button.linkKey]}
              >
                {item.button.label}
              </ExternalButton>
              <p className="ecosystem-card-note">{item.note}</p>
            </article>
          ))}
        </div>

        {/* 하단: 하나의 Apple 계정 */}
        <section className="ecosystem-footer">
          <div>
            <h3 className="ecosystem-footer-title">
              하나의 Apple 계정으로
              <br />
              이어지는 시청 경험
            </h3>
            <p className="ecosystem-footer-note">
              이용 가능 콘텐츠와 기능은 국가, 기기 및 구독 상태에 따라 다릅니다.
            </p>
          </div>

          <div>
            <ul className="ecosystem-devices">
              {ECOSYSTEM_DEVICES.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Ecosystem;
