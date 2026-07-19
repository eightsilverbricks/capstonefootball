import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AboutPage: React.FC = () => (
  <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
    <Header />

    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-bold mb-8"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
        About
      </h1>

      <div className="flex flex-col gap-6 mb-12">
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The Clark Index brings football analytics to life by using historical data, advanced statistics, and predictive modeling to forecast game outcomes. Whether you're a fan, fantasy manager, or sports bettor, The Clark Report helps you dive deeper into every matchup with data-driven insights that make every game more exciting.
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Compete against friends and football fans in The Clark Competition to prove your football IQ. With no financial risk, it's all about making the smartest picks and earning the bragging rights that come with them.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-gold)' }}>
          Founders
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Nicholas Chan, Zane Wolf, Takuo Yamamoto
        </p>
      </div>
    </main>

    <Footer />
  </div>
);

export default AboutPage;
