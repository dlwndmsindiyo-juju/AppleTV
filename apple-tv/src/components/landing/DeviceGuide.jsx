import React from "react";
import { Link } from "react-router-dom";

// 기기 안내 (구독 서비스 / 앱 / 4K 의 차이)
const deviceItems = [
  { name: "구독 서비스", desc: "Apple Original 시청" },
  { name: "Apple TV 앱", desc: "한곳에서 콘텐츠 탐색과 시청" },
  { name: "Apple TV 4K", desc: "TV에 연결하는 스트리밍 기기" },
];

// 세 가지 차이 보기 → 에코시스템 비교 페이지 (App.jsx 라우트와 맞춰 주세요)
const deviceLink = { label: "세 가지 차이 보기", path: "/ecosystem" };

const DeviceGuide = () => {
  return (
    <section className="device-guide">
      <div className="inner">
        {/* 밝은 회색 카드 */}
        <div className="device-guide-card">
          {/* 좌측: 제목 + 설명 */}
          <div className="device-guide-head">
            <h3 className="device-guide-title">
              Apple TV, 앱, Apple TV 4K.
              <br />
              이름은 비슷해도 역할은 달라요.
            </h3>
            <p className="device-guide-sub">
              여기서는 Apple Original을 탐색하고 시청합니다.
              <br />
              다른 OTT의 구독·구매와 Apple TV 4K 기기 구매는 별개입니다.
            </p>
          </div>

          {/* 우측: 세 가지 구분 + 링크 */}
          <div className="device-guide-body">
            <ul className="device-guide-list">
              {deviceItems.map((item) => (
                <li key={item.name}>
                  {item.name} — {item.desc}
                </li>
              ))}
            </ul>

            <Link className="device-guide-link" to={deviceLink.path}>
              {deviceLink.label} <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeviceGuide;
