import { useEffect, useState } from 'react';

/**
 * FamBam Splash Screen Component
 * 
 * Shows on app launch with animated logo and loading indicator.
 * Automatically hides after content loads or timeout.
 * 
 * Usage:
 *   <SplashScreen onComplete={() => setShowSplash(false)} />
 */

export default function SplashScreen({ onComplete, minDisplayTime = 2000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime, onComplete]);

  if (!isVisible) return null;

  return (
    <div style={styles.container}>
      {/* Animated Icon */}
      <div style={styles.iconWrapper}>
        <span style={styles.icon}>🏠</span>
      </div>

      {/* Logo Text */}
      <h1 style={styles.logo}>FamBam</h1>

      {/* Tagline */}
      <p style={styles.tagline}>
        Stay connected with the people who matter most
      </p>

      {/* Loading Dots */}
      <div style={styles.loader}>
        <span style={{ ...styles.dot, animationDelay: '0s' }}></span>
        <span style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
        <span style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
      </div>

      {/* CSS Keyframes (injected) */}
      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { 
      transform: translateY(0);
      opacity: 0.5;
    }
    40% { 
      transform: translateY(-12px);
      opacity: 1;
    }
  }
`;

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(165deg, #FF6B6B 0%, #FF8E53 40%, #FFE66D 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "'Nunito', sans-serif",
  },
  iconWrapper: {
    width: 120,
    height: 120,
    background: 'white',
    borderRadius: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  icon: {
    fontSize: 60,
  },
  logo: {
    fontSize: '3rem',
    fontWeight: 800,
    color: 'white',
    textShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    margin: 0,
    marginBottom: 12,
  },
  tagline: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 600,
    maxWidth: 250,
    textAlign: 'center',
    lineHeight: 1.5,
    margin: 0,
  },
  loader: {
    marginTop: 60,
    display: 'flex',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    background: 'white',
    borderRadius: '50%',
    opacity: 0.5,
    animation: 'bounce 1.4s ease-in-out infinite',
  },
};
