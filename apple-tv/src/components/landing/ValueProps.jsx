import React from "react";

// Apple TV 핵심 혜택 (설명용이라 링크 없이 span 으로 처리)
const valueProps = [
  { title: "독점 오리지널", desc: "Apple Originals 시리즈와 영화" },
  { title: "광고 없는 작품 시청", desc: "작품 본편에 집중하는 경험" },
  { title: "같은 계정, 여러 기기", desc: "지원 환경에서 연결되는 시청" },
];

const ValueProps = () => {
  return (
    <section className="value-props">
      <div className="value-props-inner">
        {valueProps.map((item) => (
          <div className="value-prop-item" key={item.title}>
            <span className="value-prop-title">{item.title}</span>
            <span className="value-prop-desc">{item.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ValueProps;
