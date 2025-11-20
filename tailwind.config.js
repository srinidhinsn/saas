/** @type {import('tailwindcss').Config} */
const theme = require('./src/components/Color&StylesManager/theme').default || require('./src/theme');
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...theme.colors,
      },
      
      // ===== SPACING SYSTEM =====
      spacing: {
        'card': '1rem',           // 16px (p-card, m-card, etc.)
        'card-lg': '1.5rem',      // 24px
        'section': '1.5rem',      // 24px
        'section-lg': '2rem',     // 32px
        'item': '0.75rem',        // 12px
        'item-sm': '0.5rem',      // 8px
      },
      
      // ===== GAP SYSTEM =====
      gap: {
        // Custom gap values
        'items': '0.75rem',       // 12px - gap between items
        'items-sm': '0.5rem',     // 8px - small gap
        'items-lg': '1rem',       // 16px - large gap
        'cards': '1.5rem',        // 24px - gap between cards
        'sections': '2rem',       // 32px - gap between sections
      },
      
      // ===== BORDER RADIUS SYSTEM =====
      borderRadius: {
        'card': '0.75rem',        // 12px - standard card radius
        'card-lg': '1rem',        // 16px - large card radius
        'button': '0.5rem',       // 8px - button radius
        'button-sm': '0.375rem',  // 6px - small button radius
        'input': '0.5rem',        // 8px - input radius
        'badge': '9999px',        // fully rounded badges
        'modal': '0.75rem',       // 12px - modal radius
      },
      
      // ===== BOX SHADOW SYSTEM =====
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      
      // ===== FONT SYSTEM =====
      fontSize: {
        'heading-xl': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],      // 48px
        'heading-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],   // 36px
        'heading-md': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],  // 30px
        'heading-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],    // 24px
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],                        // 18px
        'body': ['1rem', { lineHeight: '1.5' }],                               // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],                        // 14px
        'caption': ['0.75rem', { lineHeight: '1.4' }],                         // 12px
      },
      
      // ===== TRANSITION SYSTEM =====
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },
    },
  },
  plugins: [],
}