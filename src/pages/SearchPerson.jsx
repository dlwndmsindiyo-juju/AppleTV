// src/pages/SearchPerson.jsx
// 인물 페이지 (/search/person/:id) — 시안: 검색하기 PDF "제니퍼 로렌스"
// - 사진 · 한글/영문 이름 · 직업 · 소개 · 관심 인물 추가(Firestore 계정)
// - 출연·제작 작품: 전체 / 출연 / 제작 필터 · 관련도순 · 작품별 대한민국 이용 방법
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { IMG, useSearchStore } from "../store/useSearchStore";
import {
  BackLink,
  CardGrid,
  MaskIcon,
  departmentLabel,
  koreanName,
} from "../components/search/SearchParts";
import { openSubscribeGate } from "./Search";
import "../search.scss";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "cast", label: "출연" },
  { key: "crew", label: "제작" },
];

// 같은 작품이 여러 역할로 겹치면 하나로 (관련도 = TMDB 인기도 순)
const uniqueWorks = (list) => {
  const map = new Map();
  list.forEach((w) => {
    if (w.media_type !== "movie" && w.media_type !== "tv") return;
    const key = `${w.media_type}_${w.id}`;
    if (!map.has(key)) map.set(key, w);
  });
  return [...map.values()].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
};

const SearchPerson = () => {
  const { id } = useParams();
  const personId = Number(id);
  const location = useLocation();
  const backTo = location.state?.backTo || { path: "/search", label: "검색으로 돌아가기" };

  const user = useAuthStore((s) => s.user);
  const { people, onLoadPerson, onLoadAvailability, onToggleFavoritePerson, onLoadGenres } =
    useSearchStore();
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onLoadGenres();
    onLoadPerson(personId);
    window.scrollTo(0, 0);
  }, [personId, onLoadPerson, onLoadGenres]);

  const entry = people[personId];
  const info = entry?.info;

  const works = useMemo(() => {
    const credits = entry?.credits;
    if (!credits) return { all: [], cast: [], crew: [] };
    const cast = uniqueWorks(credits.cast || []);
    const crew = uniqueWorks(credits.crew || []);
    return { all: uniqueWorks([...(credits.cast || []), ...(credits.crew || [])]), cast, crew };
  }, [entry]);

  const list = works[filter];

  useEffect(() => {
    if (list.length) onLoadAvailability(list);
  }, [list, onLoadAvailability]);

  if (!entry || entry.status === "loading") {
    return (
      <main className="search-page search-person-page">
        <div className="search-inner">
          <p className="search-note">인물 정보를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (entry.status === "error" || !info) {
    return (
      <main className="search-page search-person-page">
        <div className="search-inner">
          <BackLink to={backTo.path} label={backTo.label} />
          <section className="search-state" role="alert">
            <h3 className="search-state-title">인물 정보를 불러오지 못했습니다.</h3>
            <button type="button" className="search-btn search-btn--white" onClick={() => onLoadPerson(personId)}>
              다시 시도
            </button>
          </section>
        </div>
      </main>
    );
  }

  const nameKo = koreanName(info);
  const nameEn = entry.nameEn || info.name;
  const roles = [
    departmentLabel(info.known_for_department),
    works.crew.length && info.known_for_department !== "Production" ? "제작자" : "",
  ].filter(Boolean);
  // 한국어 소개가 없으면 시안 문구로 대신 (배우가 아니면 둘째 줄만)
  const bio =
    info.biography ||
    [
      info.known_for_department === "Acting" ? "영화와 드라마에서 다양한 인물을 연기하는 배우입니다." : "",
      "출연·제작 작품과 각 작품의 이용 방법을 한눈에 확인하세요.",
    ]
      .filter(Boolean)
      .join("\n");

  const following = (user?.favoritePeople || []).includes(personId);
  const toggleFollow = async () => {
    if (!user) {
      openSubscribeGate();
      return;
    }
    setSaving(true);
    await onToggleFavoritePerson(personId);
    setSaving(false);
  };

  // 작품 페이지의 "OOO 작품으로 돌아가기"
  const workBackTo = { path: `${location.pathname}`, label: `${nameKo} 작품으로 돌아가기`, state: { backTo } };

  return (
    <main className="search-page search-person-page">
      <div className="search-inner">
        <BackLink to={backTo.path} label={backTo.label} />

        <section className="search-person-head">
          <div className="search-person-photo-lg">
            {info.profile_path ? (
              <img src={`${IMG}/w342${info.profile_path}`} alt={nameKo} />
            ) : (
              <span aria-hidden="true">{nameKo[0]}</span>
            )}
          </div>
          <div className="search-person-info">
            <h2 className="search-detail-title">{nameKo}</h2>
            {nameEn && nameEn !== nameKo && <p className="search-detail-sub">{nameEn}</p>}
            {roles.length > 0 && <p className="search-detail-meta">{roles.join(" · ")}</p>}
            <p className="search-detail-desc">{bio}</p>
            <button
              type="button"
              className={`search-btn search-btn--gray search-btn--icon${following ? " is-on" : ""}`}
              onClick={toggleFollow}
              disabled={saving}
              aria-pressed={following}
            >
              {following ? <MaskIcon name="check" /> : <MaskIcon name="plus" />}
              {following ? "관심 인물" : "관심 인물 추가"}
            </button>
          </div>
        </section>

        <section className="search-section">
          <div className="search-section-head">
            <h3 className="search-section-title">출연·제작 작품 {works.all.length}</h3>
            <span className="search-note">관련도순</span>
          </div>
          <div className="search-filter-row">
            <ul className="search-pills" role="tablist" aria-label="작품 구분">
              {FILTERS.map((f) => (
                <li key={f.key}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={`search-pill${filter === f.key ? " is-active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="search-note">대한민국 기준 · 이용 방법은 작품별로 표시됩니다.</p>
          </div>

          {list.length > 0 ? (
            <CardGrid items={list} backTo={workBackTo} cols={6} />
          ) : (
            <p className="search-empty">해당하는 작품이 없습니다.</p>
          )}
          <p className="search-note search-foot-note">대한민국 기준 · 작품에 따라 이용 방법이 다를 수 있습니다.</p>
        </section>
      </div>
    </main>
  );
};

export default SearchPerson;
