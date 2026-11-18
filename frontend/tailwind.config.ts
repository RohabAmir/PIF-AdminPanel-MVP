import type { Config } from 'tailwindcss';

/**
 * Design tokens extracted from the original dashboard (see docs/DESIGN-TOKENS.md).
 * Hex values are exact — measured from the running original, not approximated.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        body: '#F0F1F7',
        ink: '#333335',
        muted: '#8C9097',
        line: '#F3F3F3',
        field: '#E9EDF6',
        sidebar: { DEFAULT: '#1E1E2D', text: '#A3AED1', hover: '#27273A' },
        primary: { DEFAULT: '#845ADF', 50: '#F3EEFC', 100: '#E6DCF9', 600: '#7549AD', 700: '#6A41C9' },
        accent: { DEFAULT: '#4A4A89', light: '#6B6BA8', border: '#C9C8E8', soft: '#F0EEF8' },
        brand: { DEFAULT: '#552A0E', hover: '#F4E0CC', border: '#F7F1EB', soft: '#FCF2E6' },
        copper: '#824703',
        amber: '#F59E0B',
        violet: '#7D53B4',
        secondary: '#23B7E5',
        success: '#26BF94',
        warning: '#F5B849',
        info: '#49B6F5',
        danger: '#E6533C',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        menu: ['Montserrat', 'Inter', 'sans-serif'],
      },
      fontSize: { base: ['0.813rem', '1.25rem'] },
      borderRadius: { card: '16px', 'card-header': '10px', field: '5.6px' },
      boxShadow: {
        card: '0 0.125rem 0 rgba(10, 10, 10, 0.04)',
        footer: '0 4px 16px rgba(0, 0, 0, 0.1)',
        pop: '0 10px 30px -10px rgba(30, 30, 45, 0.25)',
      },
      backgroundImage: {
        hero: 'linear-gradient(90deg, #7549AD 0%, #4A4A89 100%)',
        'kpi-violet': 'linear-gradient(90deg, #7D53B4 0%, #EAF1FE 100%)',
        'kpi-indigo': 'linear-gradient(90deg, #4A4A89 0%, #F0EEF8 100%)',
        'kpi-copper': 'linear-gradient(135deg, #824703 0%, #FCF2E6 100%)',
        'qa-indigo': 'linear-gradient(135deg, #4A4A89 0%, #6B6BA8 100%)',
        'qa-violet': 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        'qa-copper': 'linear-gradient(135deg, #824703 0%, #F59E0B 100%)',
        'qa-soft': 'linear-gradient(135deg, #F8F9FF 0%, #F0F2FF 100%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'zoom-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'slide-in-right': 'slide-in-right .2s ease-out',
        'zoom-in': 'zoom-in .15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
