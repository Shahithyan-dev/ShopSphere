import React, { useEffect, useState } from 'react';
import './CelebrationOverlay.css';

export default function CelebrationOverlay() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate random confetti particles
    const confettiColors = ['#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#e84393', '#fdcb6e'];
    const generated = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      delay: Math.random() * 4 + 's',
      duration: Math.random() * 3 + 2 + 's',
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: Math.random() * 10 + 6 + 'px',
      shape: Math.random() > 0.5 ? 'circle' : 'square',
      rotation: Math.random() * 360 + 'deg',
      horizontalRand: (Math.random() - 0.5) * 200 + 'px'
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="celebration-overlay-container">
      <div className="confetti-wrapper">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`confetti-particle ${p.shape}`}
            style={{
              '--left': p.left,
              '--delay': p.delay,
              '--duration': p.duration,
              '--color': p.color,
              '--size': p.size,
              '--rotation': p.rotation,
              '--horizontal': p.horizontalRand
            }}
          />
        ))}
      </div>
      <div className="celebration-card">
        <div className="success-checkmark">
          <div className="check-icon">
            <span className="icon-line line-tip"></span>
            <span className="icon-line line-long"></span>
            <div className="icon-circle"></div>
            <div className="icon-fix"></div>
          </div>
        </div>
        <h2>Order Confirmed!</h2>
        <p>Thank you for shopping with ShopSphere. Your payment was verified and order is placed successfully.</p>
      </div>
    </div>
  );
}
