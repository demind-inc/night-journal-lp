import { useEffect, useState } from 'react';
import Lottie from 'lottie-react/build/index.es.js';
import catsAnimation from './assets/cat.json';
import homeShot from './assets/home.png';
import voiceInputShot from './assets/voice_input.png';
import downloadIosBadge from './assets/download-ios.svg';
import { NightSkyBackground } from './NightSkyBackground';
import './App.css';

const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL ?? 'https://apps.apple.com/'; // set VITE_DOWNLOAD_URL in .env.local
const COMPANY_URL =
  'https://demind-inc.notion.site/Company-Info-f7164ebf909b4c42a38ae6951d8376b2?source=copy_link';
const CONTACT_EMAIL = 'contact@demind-inc.com';

export default function App() {
  const [phoneHovered, setPhoneHovered] = useState(false);

  useEffect(() => {
    const preload = new Image();
    preload.src = voiceInputShot;
  }, []);

  return (
    <div className="lp">
      <NightSkyBackground />
      <header className="lp-nav">
        <div className="lp-nav__inner">
          <div className="lp-brand">
            <img className="lp-brand__logo" src="/favicon.ico" alt="" width={28} height={28} />
            <span className="lp-brand__title">2am note</span>
          </div>
        </div>
      </header>

      <main className="lp-hero" aria-label="2am note landing">
        <div className="lp-hero__inner">
          <section className="lp-copy">
            <h1 className="lp-title">
              Sleep starts with
              <br />a quieter mind.
            </h1>

            <p className="lp-subhead">
              2am note is a calming bedtime journal to unwind before sleep. Speak or write your
              thoughts, let go of the day, and build a healthier nighttime routine.
            </p>

            <div className="lp-actions" id="download">
              <a className="lp-downloadBadge" href={DOWNLOAD_URL} aria-label="Download on the App Store">
                <img
                  className="lp-downloadBadge__img"
                  src={downloadIosBadge}
                  alt="Download on the App Store"
                  draggable={false}
                />
              </a>
              <div className="lp-note">Sleep better. Reflect deeper. Wake up lighter.</div>
            </div>
          </section>

          <section className="lp-visual" aria-label="Preview">
            <div
              className="lp-visual__col lp-visual__col--left"
              aria-label="iPhone preview"
              onPointerEnter={() => setPhoneHovered(true)}
              onPointerLeave={() => setPhoneHovered(false)}
            >
              <div className="lp-phone__toggle" role="tablist" aria-label="Screens"></div>

              <div className="lp-phone__frame" aria-hidden="true">
                <div className="lp-phone__screen">
                  <img
                    className="lp-phone__img"
                    src={phoneHovered ? voiceInputShot : homeShot}
                    alt=""
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <div className="lp-visual__col lp-visual__col--right">
              <div className="lp-lottie lp-lottie--main" role="img" aria-label="Cat animation">
                <span className="lp-cat-zzz" aria-hidden="true">
                  zzz
                </span>
                <Lottie
                  animationData={catsAnimation}
                  loop
                  autoplay
                  rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <span>Copyright 2026 © DeMind Inc.</span>
          <nav className="lp-footer__links" aria-label="Footer">
            <a href={COMPANY_URL} target="_blank" rel="noopener noreferrer">
              Company
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
