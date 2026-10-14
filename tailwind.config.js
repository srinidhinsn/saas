/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // ===== NEW: landing page animations =====
        pop: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(.6)' },
          '60%': { opacity: '1', transform: 'translateY(-3px) scale(1.12)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        spinIn: {
          '0%': { opacity: '0', transform: 'perspective(400px) rotateY(-360deg) scale(.5)' },
          '100%': { opacity: '1', transform: 'perspective(400px) rotateY(0deg) scale(1)' },
        },
        press: {
          '0%, 38%, 52%, 100%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(.94)' },
        },
        ripple: {
          '0%, 43%': { opacity: '0', transform: 'scale(1, 1)' },
          '45%': { opacity: '.7', transform: 'scale(1, 1)' },
          '65%, 100%': { opacity: '0', transform: 'scale(1.18, 1.6)' },
        },
        cursorMove: {
          '0%': { opacity: '0', transform: 'translate(70px, 60px) scale(1)' },
          '12%': { opacity: '1', transform: 'translate(70px, 60px) scale(1)' },
          '38%': { opacity: '1', transform: 'translate(14px, 6px) scale(1)' },
          '45%': { opacity: '1', transform: 'translate(14px, 6px) scale(.85)' },
          '52%': { opacity: '1', transform: 'translate(14px, 6px) scale(1)' },
          '70%': { opacity: '1', transform: 'translate(14px, 6px) scale(1)' },
          '90%, 100%': { opacity: '0', transform: 'translate(40px, 40px) scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        grow: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-30px, 24px)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',

        // ===== NEW: landing page animations =====
        pop: 'pop .6s cubic-bezier(.34,1.56,.64,1) both',
        'spin-in': 'spinIn .9s ease-out both',
        press: 'press 4s ease-in-out 1.5s infinite',
        ripple: 'ripple 4s ease-out 1.5s infinite',
        cursor: 'cursorMove 4s ease-in-out 1.5s infinite both',
        'fade-up': 'fadeUp .8s ease-out backwards',
        float: 'float 6s ease-in-out infinite',
        grow: 'grow 1.4s ease-out .8s backwards',
        drift: 'drift 14s ease-in-out infinite',
      },
      colors: {
        bg: {
          primary: "#ffffff",   // card backgrounds
          secondary: "#f97316", // page background
          tertiary: "#f3f4f6",
        },
        text: {
          primary: "#111827",   // strong text
          secondary: "#6b7280", // muted text
          white: "#ffffff",
          black:"rgba(0,0,0,0.5)",
        },
        border: {
          default: "#d1d5db",
          hovering: '0 4px 10px rgba(0,0,0,0.03)'
        },
        buttons: {
          add: "#22C55E",        // green-500
          delete: "#EF4444",     // red-500
          update: "#F59E0B",     // amber-500
          configure: "#64748B",  // slate-500
        },
        action: {
          // primary:"purple",
          primary: "#5c1ba4",   // orange-500
          success: "#22c55e",   // green-500
          danger: "#ef4444",    // red-500
          // danger:"blue"
        },
        color: {
          modalsbg: 'rgba(0,0,0,0.5)',
          smallModal: 'rgba(0,0,0,0.3)'
        },
        status: {
          new: 'lightpink',
          pending: 'blue',
          preparing: 'orange',
          ready: '#ef4444',
          served: 'green'
        },
        bulkActions: {
          update: '#22c55e',
          delete: '#ef4444',
          adding: '#f97316'
        },
        bulkActionsHover: {
          updateHover: '#22c44e',
          deleteHover: 'orange',
          addingHover: '#f97308'
        },
        tableStatusBg: {
          vacant: '#dcfce7',
          occupied: '#fee2e2',
          reserved: '#fef9c3'
        },
        tableStatusText: {
          vacant: '#15803d',
          occupied: '#b91c1c',
          reserved: '#a16207'
        },
        modalsUpdateBg:{
          save:'green',
          cancel:'gray'
        },
        cardBackgrounds: {
          bg1: '#FFF7ED',  // orange-50
          bg2: '#FEFCE8',  // yellow-50
          bg3: '#EEF2FF',  // indigo-50
          bg4: '#FDF2F8',  // pink-50
          bg5: '#FFFBEB',  // amber-50
          bg6: '#F0FDFA',  // teal-50
          bg7: '#F9FAFB',  // gray-50
        },

        // ===== NEW: landing page colors =====
        // Main accent (buttons, links, highlights, dark banner)
        brand: {
          50: '#faf7ff',
          100: '#f3ebff',
          200: '#e7d6ff',
          300: '#d3b4ff',
          400: '#b77cff',
          500: '#9b4dff',
          600: '#8128ed',
          700: '#6d1dca',
          800: '#5c1ba4',
          900: '#4b1883',
        },
        // Backgrounds
        page: '#fafaf9',      // page background + inner panels
        surface: '#ffffff',   // header, cards, alternate sections, footer
        soft: '#f5f5f4',      // chips and hover backgrounds
        // Text
        // NOTE: renamed from "body" to "copy" because your fontSize already has "text-body"
        ink: '#1c1917',       // headings and strong text
        copy: '#57534e',      // paragraphs and labels
        muted: '#78716c',     // small / secondary text
        // Borders
        line: {
          DEFAULT: '#e7e5e4', // cards and dividers
          strong: '#d6d3d1',  // inputs and outlined buttons
        },
        // Status colors (badges)
        success: { DEFAULT: '#047857', soft: '#ecfdf5', line: '#a7f3d0' },
        warning: { DEFAULT: '#b45309', soft: '#fffbeb', line: '#fde68a' },
      },

      // ===== NEW: landing page fonts (also add the Google Fonts link in index.html) =====
      // "inter" is a new key, so your existing app keeps its current sans font.
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
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
        'button-sm': '8px',  // 6px - small button radius
        'input': '0.5rem',        // 8px - input radius
        'badge': '9999px',        // fully rounded badges
        'modal': '0.75rem',       // 12px - modal radius

        // NEW: landing page
        'btn': '0.5rem',          // buttons, inputs, chips
        'panel': '1.5rem',        // big panels (demo banner)
      },
      borderWidth: {
        'default': '1px',    // creates: border-default
      },
      // ===== BOX SHADOW SYSTEM =====
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'soft': '0 10px 40px -12px rgba(28,45,74,.15)', // NEW: landing page
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
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
}