/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C89B3C',
          light: '#F0D590',
          dark: '#785A28',
          dim: '#97722B',
          faint: '#C89B3C20',
        },
        surface: {
          DEFAULT: '#0A0E1A',
          1: '#111827',
          2: '#1A1F2E',
          3: '#1F2640',
          4: '#252D47',
        },
        ink: {
          DEFAULT: '#F0E6D3',
          2: '#A09070',
          3: '#5C5040',
          4: '#3A3028',
        },
        win: '#4CAF82',
        loss: '#E84057',
        blue: '#4A9EEA',
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        rajdhani: ['"Rajdhani"', 'sans-serif'],
        orbitron: ['"Orbitron"', 'monospace'],
      },
      borderColor: {
        DEFAULT: '#2A3147',
      },
      backgroundImage: {
        'hex-pattern': 'radial-gradient(circle, #C89B3C08 1px, transparent 1px)',
        'gold-gradient': 'linear-gradient(135deg, #C89B3C, #F0D590, #C89B3C)',
      },
      backgroundSize: {
        'hex': '30px 30px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 #C89B3C40' },
          '50%': { boxShadow: '0 0 0 8px #C89B3C00' },
        },
        'counter': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-right': 'slide-right 0.4s ease forwards',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'counter': 'counter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
}
