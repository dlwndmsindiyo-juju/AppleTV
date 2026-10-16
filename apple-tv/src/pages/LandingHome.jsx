import LandingHero from '../components/landing/LandingHero';
import InfoStrip from '../components/landing/InfoStrip';
import Top10Section from '../components/landing/Top10Section';
import UpcomingSection from '../components/landing/UpcomingSection';
import OriginalsSection from '../components/landing/OriginalsSection';
import PromoBanner from '../components/landing/PromoBanner';
import DeviceGuide from '../components/landing/DeviceGuide';
import '../components/landing/Landing.scss';
import {
  heroData,
  infoItems,
  top10Items,
  upcomingItems,
  originalsItems,
  promoData,
  deviceGuide,
} from '../data/landingData';

// 주의: App.scss 의 `main h2 { padding-top: 200px }` 때문에 <main> 대신 <div> 사용
const LandingHome = () => (
  <div className="landing">
    <LandingHero data={heroData} />
    <InfoStrip items={infoItems} />
    <Top10Section items={top10Items} />
    <UpcomingSection items={upcomingItems} />
    <OriginalsSection items={originalsItems} />
    <PromoBanner data={promoData} />
    <DeviceGuide data={deviceGuide} />
  </div>
);

export default LandingHome;
