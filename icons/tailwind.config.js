/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // FamBam Color Palette - Warm & Playful
      colors: {
        coral: '#FF6B6B',
        tangerine: '#FF8E53',
        sunshine: '#FFE66D',
        cream: '#FFF9F5',
        blush: '#FFF5F5',
        charcoal: '#333333',
        gray: {
          DEFAULT: '#555555',
          muted: '#999999',
        },
      },
      
      // Nunito Font Family
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      
      // Custom Border Radius
      borderRadius: {
        'card': '20px',
        'button': '30px',
        'input': '14px',
        'avatar': '50%',
      },
      
      // Custom Box Shadows
      boxShadow: {
        'card': '0 4px 15px rgba(0, 0, 0, 0.05)',
        'button': '0 8px 25px rgba(255, 107, 107, 0.3)',
        'icon': '0 15px 40px rgba(0, 0, 0, 0.15)',
      },
      
      // Custom Gradients (use with bg-gradient-to-r/br)
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
        'gradient-soft': 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)',
        'gradient-splash': 'linear-gradient(165deg, #FF6B6B 0%, #FF8E53 40%, #FFE66D 100%)',
      },
      
      // Custom Animations
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
      },
      keyframes: {
        'bounce-dot': {
          '0%, 80%, 100%': { 
            transform: 'translateY(0)', 
            opacity: '0.5' 
          },
          '40%': { 
            transform: 'translateY(-12px)', 
            opacity: '1' 
          },
        },
      },
    },
  },
  plugins: [],
}
