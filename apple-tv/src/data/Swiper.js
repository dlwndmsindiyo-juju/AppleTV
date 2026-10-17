import React from 'react';
// Swiper React 및 필수 모듈 Import
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';

// Swiper 스타일 Import
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

// 6개의 영화 데이터 샘플
const MOVIES = [
  {
    id: 1,
    title: '인터스텔라',
    category: 'SF / Adventure',
    rating: '9.8',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: '세계 각국의 정부와 경제가 완전히 붕괴된 미래, 인류의 구원을 위해 우주로 떠나는 탐사대.'
  },
  {
    id: 2,
    title: '라라랜드',
    category: 'Romance / Musical',
    rating: '9.5',
    poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    description: '꿈을 두드리는 청춘들의 열정과 사랑, 아름다운 음악과 함께 펼쳐지는 마법 같은 이야기.'
  },
  {
    id: 3,
    title: '다크 나이트',
    category: 'Action / Crime',
    rating: '9.9',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    description: '범죄와 혼돈이 뒤덮은 고담시, 정의의 기사 배트맨과 광기의 천재 조커의 고독한 대결.'
  },
  {
    id: 4,
    title: '아바타: 물의 길',
    category: 'SF / Action',
    rating: '9.3',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: '판도라 행성에서 제이크 설리와 네이티리가 이루는 가족과 위협 속에서 살아남기 위한 여정.'
  },
  {
    id: 5,
    title: '센과 치히로의 행방불명',
    category: 'Animation / Fantasy',
    rating: '9.7',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    description: '금지된 세계로 들어간 소녀 치히로, 신들의 온천장에서 부모님을 구하기 위한 좌충우돌 라이프.'
  },
  {
    id: 6,
    title: '기생충',
    category: 'Drama / Thriller',
    rating: '9.6',
    poster: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    description: '전원백수로 살아가던 기택네 장남 기우가 고액 과외 면접을 위해 박사장네 집에 발을 들이면서 시작되는 전개.'
  }
];

export default function MovieSwiper() {
  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      background: '#0f172a',
      borderRadius: '24px',
      color: '#fff',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#f8fafc' }}>
          🎬 추천 영화 라인업
        </h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Swiper Navigation과 Pagination으로 구현된 6개의 추천 영화 슬라이더
        </p>
      </div>

      <style>{`
        /* Swiper 커스텀 스타일ing */
        .movie-swiper {
          padding-bottom: 50px !important;
        }
        .swiper-button-next,
        .swiper-button-prev {
          color: #38bdf8 !important;
          background: rgba(15, 23, 42, 0.7);
          width: 48px !important;
          height: 48px !important;
          border-radius: 50%;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .swiper-button-next:after,
        .swiper-button-prev:after {
          font-size: 20px !important;
          font-weight: bold;
        }
        .swiper-button-next:hover,
        .swiper-button-prev:hover {
          background: #38bdf8;
          color: #0f172a !important;
          transform: scale(1.1);
        }
        .swiper-pagination-bullet {
          background: #64748b !important;
          opacity: 0.6;
          width: 10px;
          height: 10px;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          background: #38bdf8 !important;
          opacity: 1;
          width: 28px;
          border-radius: 12px;
        }
      `}</style>

      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
        effect="coverflow"
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
        }}
        coverflowEffect={{
          rotate: 15,
          stretch: 0,
          depth: 200,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={true}
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        className="movie-swiper"
      >
        {MOVIES.map((movie) => (
          <SwiperSlide key={movie.id}>
            <div style={{
              background: '#1e293b',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'transform 0.3s ease',
              height: '100%'
            }}>
              <div style={{ position: 'relative', height: '360px', overflow: 'hidden' }}>
                <img
                  src={movie.poster}
                  alt={movie.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: '#fbbf24',
                  backdropFilter: 'blur(4px)'
                }}>
                  ★ {movie.rating}
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#38bdf8',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {movie.category}
                </span>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  margin: '8px 0',
                  color: '#f8fafc'
                }}>
                  {movie.title}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#94a3b8',
                  lineHeight: '1.5',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {movie.description}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}