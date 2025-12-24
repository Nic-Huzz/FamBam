import { useEffect, useState } from 'react';

/**
 * FamBam Splash Screen Component (Tailwind CSS version)
 * 
 * Shows on app launch with animated logo and loading indicator.
 * Requires Tailwind CSS to be configured in your project.
 * 
 * Add to tailwind.config.js:
 *   animation: {
 *     'pulse-slow': 'pulse 2s ease-in-out infinite',
 *     'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
 *   },
 *   keyframes: {
 *     'bounce-dot': {
 *       '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
 *       '40%': { transform: 'translateY(-12px)', opacity: '1' },
 *     },
 *   },
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
    <div className="fixed inset-0 bg-gradient-to-br from-coral via-tangerine to-sunshine flex flex-col items-center justify-center z-[9999] font-nunito">
      {/* Animated Icon */}
      <div className="w-[120px] h-[120px] bg-white rounded-[30px] flex items-center justify-center mb-8 shadow-xl animate-pulse-slow">
        <span className="text-6xl">🏠</span>
      </div>

      {/* Logo Text */}
      <h1 className="text-5xl font-extrabold text-white drop-shadow-lg mb-3">
        FamBam
      </h1>

      {/* Tagline */}
      <p className="text-lg text-white/90 font-semibold max-w-[250px] text-center leading-relaxed">
        Stay connected with the people who matter most
      </p>

      {/* Loading Dots */}
      <div className="mt-16 flex gap-2">
        <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce-dot" style={{ animationDelay: '0s' }}></span>
        <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce-dot" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce-dot" style={{ animationDelay: '0.4s' }}></span>
      </div>
    </div>
  );
}
