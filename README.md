/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enable dark mode with 'class' strategy
  darkMode: 'class', // 👈 Add this line
  
  theme: {
    extend: {
      // ===== CENTRALIZED COLOR SYSTEM WITH DARK MODE =====
      colors: {
        // Background colors
        'bg-primary': '#ffffff',      // Light: white, Dark: will use dark:bg-bg-primary
        'bg-secondary': '#fef3f2',    // Light: cream, Dark: will use dark:bg-bg-secondary
        'bg-tertiary': '#f3f4f6',     // Light: gray, Dark: will use dark:bg-bg-tertiary
        
        // Dark mode backgrounds
        'bg-primary-dark': '#1f2937',    // Dark mode card background
        'bg-secondary-dark': '#111827',  // Dark mode page background
        'bg-tertiary-dark': '#374151',   // Dark mode panels
        
        // Text colors
        'text-primary': '#111827',    // Light: dark gray
        'text-secondary': '#6b7280',  // Light: muted gray
        'text-white': '#ffffff',      // Always white
        
        // Dark mode text
        'text-primary-dark': '#f9fafb',   // Dark mode: light text
        'text-secondary-dark': '#9ca3af', // Dark mode: muted text
        
        // Border colors
        'border-default': '#d1d5db',      // Light border
        'border-default-dark': '#4b5563', // Dark border
        
        // Action colors (same for both modes, but you can customize)
        'action-primary': '#f97316',         // orange-500
        'action-primary-hover': '#ea580c',   // orange-600
        'action-success': '#22c55e',         // green-500
        'action-success-hover': '#16a34a',   // green-600
        'action-danger': '#ef4444',          // red-500
        'action-danger-hover': '#dc2626',    // red-600
      },
      
      // ===== SPACING SYSTEM =====
      spacing: {
        'card': '1rem',           // 16px
        'card-lg': '1.5rem',      // 24px
        'section': '1.5rem',      // 24px
        'section-lg': '2rem',     // 32px
        'item': '0.75rem',        // 12px
        'item-sm': '0.5rem',      // 8px
      },
      
      // ===== GAP SYSTEM =====
      gap: {
        'items': '0.75rem',       // 12px
        'items-sm': '0.5rem',     // 8px
        'items-lg': '1rem',       // 16px
        'cards': '1.5rem',        // 24px
        'sections': '2rem',       // 32px
      },
      
      // ===== BORDER RADIUS SYSTEM =====
      borderRadius: {
        'card': '0.75rem',        // 12px
        'card-lg': '1rem',        // 16px
        'button': '0.5rem',       // 8px
        'button-sm': '0.375rem',  // 6px
        'input': '0.5rem',        // 8px
        'badge': '9999px',        // fully rounded
        'modal': '0.75rem',       // 12px
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
        'heading-xl': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-md': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
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