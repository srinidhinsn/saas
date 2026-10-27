import plugin from 'tailwindcss/plugin';

/* ======================================================================
   THEME SWITCH — the ONLY place to change the app's accent colour.
   Swap the active palette below; every brand-*, ui-* class, shadow and
   gradient follows. (Table state colours stay as-is on purpose:
   green/red/amber must keep their meaning.)
   ====================================================================== */
const PURPLE = {
  DEFAULT: '#7953a7', dark: '#69458f', darker: '#55347c',
  light: '#f5f0f9', soft: '#e9ddf5', line: '#e1d4ee',
  ring: '#a47dc9', tint: '#faf7fd',
  edge: '#eee6f7',
  shadowRgb: '60,35,95',
};
const ORANGE = {
  DEFAULT: '#e8742a', dark: '#b94f12', darker: '#8f3b0a',
  light: '#fff4ec', soft: '#fde3d0', line: '#f8d2b8',
  ring: '#f09a5c', tint: '#fffaf6',
  edge: '#fbe9dc',
  shadowRgb: '120,60,20',
};
const FONT = 'Inter, "Segoe UI", Arial, sans-serif';   // the one font stack
const THEME = PURPLE;   // <-- change to ORANGE to switch the whole app

/* ======================================================================
   ORIGINAL (legacy) button colour codes — kept exactly as they were.
   Used by the old `action.*`, `bulkActions.*`, `bulkActionsHover.*` tokens
   below and by the CLASSIC button preset.
   ====================================================================== */
const LEGACY = {
  config: '#7a7776',         
  success: '#22c55e',        // old "Config" button      (action.success)
  danger: '#ef4444',         // old red                  (action.danger)
  update: '#22c55e',         // bulkActions.update
  delete: '#ef4444',         // old "Bulk Delete" button (bulkActions.delete)
  adding: '#f97316',         // old "Add Table" button   (bulkActions.adding)
  updateHover: '#22c44e',    // old "Bulk Update" hover
  deleteHover: 'orange',     // old "Bulk Delete" hover
  addingHover: '#f97308',    // old "Add Table" hover
  textWhite: '#ffffff',
  textPrimary: '#111827',
};

/* ======================================================================
   TOOLBAR BUTTON COLOURS — Config / Bulk Update / Bulk Delete / Add Table.
   Pick a preset below (BUTTONS = ...). Edit a value here to change that
   one button everywhere it is used (classes: ui-btn-config, ui-btn-update,
   ui-btn-delete, ui-btn-add).
   Fields: bg, text, border, hover (background), hoverText.
   ====================================================================== */
const BTN_ANALYTICS = {     // matches the Analytics look; follows THEME
  config: { bg: THEME.light, text: THEME.dark, border: THEME.line, hover: THEME.soft, hoverText: THEME.dark },
  update: { bg: THEME.light, text: THEME.dark, border: THEME.line, hover: THEME.soft, hoverText: THEME.dark },
  delete: { bg: '#ffffff', text: '#c9473d', border: '#f0c9c5', hover: '#fdeceb', hoverText: '#c9473d' },
  add: { bg: THEME.DEFAULT, text: '#ffffff', border: THEME.DEFAULT, hover: THEME.dark, hoverText: '#ffffff' },
};
const BTN_CLASSIC = {       // the original colour codes, button by button
  config: { bg: LEGACY.config, text: LEGACY.textWhite, border: LEGACY.config, hover: LEGACY.config, hoverText: LEGACY.textPrimary },
  update: { bg: LEGACY.update, text: LEGACY.textWhite, border: LEGACY.DEFAULT, hover: LEGACY.updateHover, hoverText: LEGACY.textPrimary },
  delete: { bg: LEGACY.delete, text: LEGACY.textWhite, border: LEGACY.delete, hover: LEGACY.deleteHover, hoverText: LEGACY.textPrimary },
  add: { bg: LEGACY.adding, text: LEGACY.textWhite, border: LEGACY.adding, hover: LEGACY.addingHover, hoverText: LEGACY.textPrimary },
};
const BUTTONS = BTN_CLASSIC;   // <-- change to BTN_CLASSIC for the original colours

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
        // NEW: modal pop-in (replaces the inline <style> in TableManagement)
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'spin-slow': 'spinSlow 0.8s linear infinite',
      },

      colors: {
        /* ================= EXISTING (unchanged, other screens use these) ================= */
        bg: {
          primary: "#ffffff",
          secondary: "#f97316",
          tertiary: "#f3f4f6",
        },
        text: {
          primary: "#111827",
          secondary: "#6b7280",
          white: "#ffffff",
          black: "rgba(0,0,0,0.5)",
        },
        border: {
          default: "#d1d5db",
          hovering: '0 4px 10px rgba(0,0,0,0.03)'
        },
        action: {
          primary: THEME.DEFAULT,
          success: LEGACY.success,
          danger: LEGACY.danger,
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
          update: LEGACY.update,
          delete: LEGACY.delete,
          adding: LEGACY.adding
        },
        bulkActionsHover: {
          updateHover: LEGACY.updateHover,
          deleteHover: LEGACY.deleteHover,
          addingHover: LEGACY.addingHover
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
        modalsUpdateBg: {
          save: 'green',
          cancel: 'gray'
        },
        cardBackgrounds: {
          bg1: '#FFF7ED',
          bg2: '#FEFCE8',
          bg3: '#EEF2FF',
          bg4: '#FDF2F8',
          bg5: '#FFFBEB',
          bg6: '#F0FDFA',
          bg7: '#F9FAFB',
        },

        /* ================= NEW: Analytics design standards =================
           Namespaced so nothing existing is overridden.                      */

        // Brand purple (analytics primary)
        brand: {
          DEFAULT: THEME.DEFAULT,  // primary buttons, active accents
          dark: THEME.dark,        // headings, KPI values, text on light surface
          darker: THEME.darker,    // active toggle text
          light: THEME.light,      // light surface (buttons, toggle track)
          soft: THEME.soft,        // hover / active surface
          line: THEME.line,        // tinted borders
          ring: THEME.ring,        // focus ring / focus border
          tint: THEME.tint,        // top of KPI gradient
        },

        page: '#fafaf9',      // page background + inner panels
        surface: '#ffffff',   // header, cards, alternate sections, footer
        soft: '#f5f5f4',

        // Toolbar buttons (from BUTTONS above): bg-btn-config, text-btn-update-text, ...
        btn: Object.fromEntries(Object.entries(BUTTONS).map(([k, v]) => [k, {
          DEFAULT: v.bg, text: v.text, line: v.border, hover: v.hover, 'hover-text': v.hoverText,
        }])),

        // Page canvas
        canvas: '#f3f6f9',
        surface: '#ffffff',      // card / panel / modal background

        // Destructive actions (delete). Separate from table state 'occupied'.
        danger: { DEFAULT: '#c9473d', bg: '#fdeceb', border: '#f0c9c5', hover: '#b03a31' },

        // Text
        ink: {
          DEFAULT: '#17283b',  // main text
          soft: '#354b60',     // secondary text
          muted: '#6d7f90',    // captions, hints
          faint: '#8d9aa8',    // placeholders
        },

        // Neutral borders / dividers
        line: {
          DEFAULT: '#dbe5ec',
          soft: '#e9eff3',
          divider: '#e1e8ef',
          panel: THEME.edge,    // 2px top edge on panels
        },

        // Table state colours (vacant / occupied / reserved / other)
        state: {
          vacant: { DEFAULT: '#1d9e6a', bg: '#e7f6ee' },
          occupied: { DEFAULT: '#c9473d', bg: '#fdeceb', border: '#f0c9c5', hover: '#b03a31' },
          reserved: { DEFAULT: '#b7791f', bg: '#fdf3dc' },
          other: { DEFAULT: '#2879bd', bg: '#e8f1fa' },
        },

        backdrop: 'rgba(17,24,39,0.45)',
      },

      fontFamily: {
        sans: FONT,
      },

      /* ===== SPACING SYSTEM ===== */
      spacing: {
        'card': '1rem',
        'card-lg': '1.5rem',
        'section': '1.5rem',
        'section-lg': '2rem',
        'item': '0.75rem',
        'item-sm': '0.5rem',
        // NEW
        'panel': '0.875rem',      // 14px  – analytics panel padding
        'page-x': '1.375rem',     // 22px  – analytics page side padding
        'page-y': '1.125rem',     // 18px
        'modal': '1.25rem',       // 20px  – modal padding
        'tile': '0.625rem',       // 10px  – KPI card vertical padding
        'dot': '6px',             // status dot in chips
      },

      gap: {
        'items': '0.75rem',
        'items-sm': '0.5rem',
        'items-lg': '1rem',
        'cards': '1.5rem',
        'sections': '2rem',
        // NEW
        'tiles': '0.625rem',      // 10px – gap between KPI/table tiles
      },

      borderRadius: {
        'card': '0.75rem',
        'card-lg': '1rem',
        'button': '0.5rem',
        'button-sm': '8px',
        'input': '0.5rem',
        'badge': '9999px',
        'modal': '0.75rem',
        // NEW
        'panel': '9px',           // analytics cards / panels
        'modal-lg': '13px',       // analytics modal
        'seg': '6px',             // segmented-toggle buttons
        'toggle': '9px',          // segmented-toggle container
      },

      height: { control: '36px' },          // buttons + inputs
      minHeight: { metric: '78px' },        // KPI card
      maxWidth: {
        modal: '420px',        // max-w-modal     small confirm / edit
        'modal-md': '36rem',   // max-w-modal-md  config / add
        'modal-lg': '48rem',   // max-w-modal-lg  lists / bulk update / bulk delete
      },         // confirm modal
      gridTemplateColumns: {
        kpi: 'repeat(auto-fit,minmax(150px,1fr))',     // KPI row
        tiles: 'repeat(auto-fill,minmax(168px,1fr))',  // table cards
      },

      borderWidth: {
        'default': '1px',
        // NEW
        'bar': '3px',             // coloured top edge on KPI / table cards
        'panel': '2px',
      },

      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        // NEW
        'panel': '0 2px 7px rgba(22,53,73,0.045)',
        'panel-hover': `0 4px 14px rgba(${THEME.shadowRgb},0.10)`,
        'seg-active': `0 1px 3px rgba(${THEME.shadowRgb},0.14)`,
        'modal-lg': '0 25px 70px rgba(15,23,42,0.25)',
        'focus-ring': `0 0 0 2px ${THEME.soft}`,
      },

      backgroundImage: {
        'metric': `linear-gradient(180deg, ${THEME.tint}, #ffffff 65%)`,
      },

      fontSize: {
        'heading-xl': ['3.5rem', { lineHeight: '1.15', fontWeight: '700' }],     // 56px
        'heading-lg': ['2.75rem', { lineHeight: '1.2', fontWeight: '700' }],     // 44px
        'heading-md': ['2.25rem', { lineHeight: '1.25', fontWeight: '600' }],    // 36px
        'heading-sm': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],     // 28px

        'body-lg': ['1.25rem', { lineHeight: '1.6' }],                          // 20px
        'body': ['1.125rem', { lineHeight: '1.6' }],                             // 18px
        'body-sm': ['1rem', { lineHeight: '1.5' }],                              // 16px
        'caption': ['0.875rem', { lineHeight: '1.5' }],                          // 14px

        // Analytics type scale — increased sizes
        'page-title': ['1.5rem', { lineHeight: '1.3', fontWeight: '750' }],     // 24px
        'panel-title': ['1rem', { lineHeight: '1.4', fontWeight: '750' }],      // 16px
        'kpi': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],            // 28px
        'ui': ['0.875rem', { lineHeight: '1.5' }],                               // 14px
        'ui-sm': ['0.8125rem', { lineHeight: '1.5' }],                           // 13px
        'micro': ['0.75rem', { lineHeight: '1.4' }],                             // 12px
      },

      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },

    /* ===== NEW: reusable analytics-style components =====
       Use these class names on any screen: ui-panel, ui-metric, ui-btn, ...   */
    plugin(function ({ addComponents, theme }) {
      const brand = (k) => theme(`colors.brand.${k}`);
      // fontSize entries can be a string or [size, options] depending on version
      const fs = (k) => [].concat(theme(`fontSize.${k}`))[0];
      addComponents({
        '.ui-page': {
          fontFamily: FONT,
          backgroundColor: theme('colors.canvas'),
          color: theme('colors.ink.DEFAULT'),
          minHeight: '100vh',
          padding: `${theme('spacing.page-y')} ${theme('spacing.page-x')} ${theme('spacing.section-lg')}`,
        },

        '.ui-panel': {
          backgroundColor: theme('colors.surface'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderTop: `${theme('borderWidth.panel')} solid ${theme('colors.line.panel')}`,
          borderRadius: theme('borderRadius.panel'),
          boxShadow: theme('boxShadow.panel'),
          padding: theme('spacing.panel'),
          marginBottom: theme('spacing.item'),
        },

        '.ui-metric': {
          backgroundImage: theme('backgroundImage.metric'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderTop: `${theme('borderWidth.bar')} solid ${brand('soft')}`,
          borderRadius: theme('borderRadius.panel'),
          boxShadow: theme('boxShadow.panel'),
          padding: `${theme('spacing.tile')} ${theme('spacing.item')}`,
          minHeight: theme('minHeight.metric'),
        },

        '.ui-chip': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme('spacing.item-sm'),
          fontSize: fs('micro'),
          fontWeight: '700',
          textTransform: 'capitalize',
          padding: '0.2rem 0.5rem',
          borderRadius: theme('borderRadius.badge'),
          whiteSpace: 'nowrap',
          '&::before': {
            content: '""',
            width: theme('spacing.dot'),
            height: theme('spacing.dot'),
            borderRadius: '50%',
            backgroundColor: 'currentColor',
          },
        },

        /* buttons */
        '.ui-btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme('spacing.item-sm'),
          height: theme('height.control'),
          padding: `0 ${theme('spacing.panel')}`,
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: brand('light'),
          color: brand('dark'),
          fontSize: fs('ui'),
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'background-color .15s ease, border-color .15s ease',
          '&:hover': { backgroundColor: brand('soft') },
          '&:focus-visible': { outline: `2px solid ${brand('ring')}`, outlineOffset: '2px' },
          '&:disabled': { opacity: '0.5', cursor: 'default' },
        },
        '.ui-btn-primary': {
          backgroundColor: brand('DEFAULT'),
          borderColor: brand('DEFAULT'),
          color: theme('colors.surface'),
          '&:hover': { backgroundColor: brand('dark') },
        },
        '.ui-btn-danger-outline': {
          backgroundColor: theme('colors.surface'),
          borderColor: theme('colors.danger.border'),
          color: theme('colors.danger.DEFAULT'),
          '&:hover': { backgroundColor: theme('colors.danger.bg') },
        },
        '.ui-btn-danger': {
          backgroundColor: theme('colors.danger.DEFAULT'),
          borderColor: theme('colors.danger.DEFAULT'),
          color: theme('colors.surface'),
          '&:hover': { backgroundColor: theme('colors.danger.hover') },
        },

        /* per-button toolbar styles (colours come from BUTTONS) */
        ...Object.fromEntries(['config', 'update', 'delete', 'add'].map((k) => [`.ui-btn-${k}`, {
          backgroundColor: theme(`colors.btn.${k}.DEFAULT`),
          borderColor: theme(`colors.btn.${k}.line`),
          color: theme(`colors.btn.${k}.text`),
          '&:hover': {
            backgroundColor: theme(`colors.btn.${k}.hover`),
            color: theme(`colors.btn.${k}.hover-text`),
          },
        }])),

        /* segmented toggle (same as analytics Table / Chart switch) */
        '.ui-toggle': {
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: '2px',
          padding: '3px',
          backgroundColor: brand('light'),
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.toggle'),
        },
        '.ui-toggle-btn': {
          border: '0',
          backgroundColor: 'transparent',
          borderRadius: theme('borderRadius.seg'),
          padding: `${theme('spacing.item-sm')} ${theme('spacing.item')}`,
          fontSize: fs('ui'),
          fontWeight: '650',
          color: theme('colors.ink.soft'),
          cursor: 'pointer',
          '&:hover': { color: brand('dark') },
        },
        '.ui-toggle-btn-active': {
          backgroundColor: brand('soft'),
          color: brand('darker'),
          boxShadow: theme('boxShadow.seg-active'),
        },

        /* form input */
        '.ui-input': {
          width: '100%',
          height: theme('height.control'),
          padding: `0 ${theme('spacing.item')} 0 2rem`,
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: theme('colors.surface'),
          fontSize: fs('ui'),
          color: theme('colors.ink.DEFAULT'),
          outline: 'none',
          '&::placeholder': { color: theme('colors.ink.faint') },
          '&:focus': { borderColor: brand('ring'), boxShadow: theme('boxShadow.focus-ring') },
        },

        /* modal */
        '.ui-backdrop': {
          position: 'fixed',
          inset: '0',
          zIndex: '1200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme('spacing.card'),
          backgroundColor: theme('colors.backdrop'),
        },
        '.ui-modal': {
          width: '100%',
          maxWidth: theme('maxWidth.modal'),
          backgroundColor: theme('colors.surface'),
          borderRadius: theme('borderRadius.modal-lg'),
          boxShadow: theme('boxShadow.modal-lg'),
          padding: theme('spacing.modal'),
          color: theme('colors.ink.DEFAULT'),
        },
         '.ui-backdrop-top': { zIndex: '1300' },
 
        /* dialog shell: head / scrolling body / foot */
        '.ui-dialog': {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxHeight: 'calc(100dvh - 1.5rem)',
          overflow: 'hidden',
          backgroundColor: theme('colors.surface'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderRadius: theme('borderRadius.modal-lg'),
          boxShadow: theme('boxShadow.modal-lg'),
          color: theme('colors.ink.DEFAULT'),
          fontFamily: FONT,
        },
        '.ui-dialog-head': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme('spacing.item'),
          padding: `${theme('spacing.item')} ${theme('spacing.modal')}`,
          backgroundColor: brand('light'),
          borderBottom: `1px solid ${brand('line')}`,
          flexShrink: '0',
        },
        '.ui-dialog-body': {
          flex: '1 1 auto',
          overflowY: 'auto',
          padding: `${theme('spacing.card')} ${theme('spacing.modal')}`,
        },
        '.ui-dialog-foot': {
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: theme('spacing.item-sm'),
          padding: `${theme('spacing.item')} ${theme('spacing.modal')}`,
          backgroundColor: theme('colors.canvas'),
          borderTop: `1px solid ${theme('colors.line.DEFAULT')}`,
          flexShrink: '0',
        },
 
        /* form controls */
        '.ui-label': {
          display: 'block',
          marginBottom: '0.25rem',
          fontSize: fs('micro'),
          fontWeight: '700',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: theme('colors.ink.muted'),
        },
        '.ui-field': {
          width: '100%',
          height: theme('height.control'),
          padding: `0 ${theme('spacing.item')}`,
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: theme('colors.surface'),
          fontSize: fs('ui'),
          color: theme('colors.ink.DEFAULT'),
          outline: 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
          '&::placeholder': { color: theme('colors.ink.faint') },
          '&:focus': { borderColor: brand('ring'), boxShadow: theme('boxShadow.focus-ring') },
          '&:disabled': { opacity: '0.5', cursor: 'not-allowed' },
        },
        '.ui-field-error': {
          borderColor: theme('colors.danger.DEFAULT'),
          backgroundColor: theme('colors.danger.bg'),
        },
        '.ui-error-text': {
          marginTop: '0.25rem',
          fontSize: fs('micro'),
          fontWeight: '600',
          color: theme('colors.danger.DEFAULT'),
        },
        '.ui-check': {
          width: '1rem',
          height: '1rem',
          accentColor: brand('DEFAULT'),
          cursor: 'pointer',
        },
        '.ui-count': {
          fontSize: fs('micro'),
          fontWeight: '700',
          padding: '0.1rem 0.5rem',
          borderRadius: theme('borderRadius.badge'),
          backgroundColor: brand('light'),
          color: brand('dark'),
          border: `1px solid ${brand('line')}`,
        },
        '.ui-icon-btn': {
          display: 'grid',
          placeItems: 'center',
          width: theme('spacing.section-lg'),
          height: theme('spacing.section-lg'),
          flexShrink: '0',
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: theme('colors.surface'),
          color: theme('colors.ink.muted'),
          cursor: 'pointer',
          '&:hover': { backgroundColor: brand('soft'), color: brand('dark') },
        },
 
        /* selectable list row (bulk delete etc.) */
        '.ui-row': {
          display: 'flex',
          alignItems: 'center',
          gap: theme('spacing.item'),
          padding: theme('spacing.item'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderRadius: theme('borderRadius.panel'),
          backgroundColor: theme('colors.surface'),
          cursor: 'pointer',
          transition: 'background-color .15s ease, border-color .15s ease',
          '&:hover': { backgroundColor: brand('tint'), borderColor: brand('line') },
        },
        '.ui-row-selected': {
          backgroundColor: brand('tint'),
          borderColor: brand('ring'),
        },
 
        /* − [n] + number stepper */
        '.ui-stepper': {
          display: 'flex',
          alignItems: 'stretch',
          height: theme('height.control'),
          overflow: 'hidden',
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: theme('colors.surface'),
          '&:focus-within': { borderColor: brand('ring'), boxShadow: theme('boxShadow.focus-ring') },
          '& button': {
            padding: `0 ${theme('spacing.item')}`,
            fontWeight: '700',
            color: brand('dark'),
            cursor: 'pointer',
            '&:hover': { backgroundColor: brand('light') },
          },
          '& input': {
            flex: '1 1 0%',
            minWidth: '0',
            textAlign: 'center',
            fontSize: fs('ui'),
            fontWeight: '600',
            color: theme('colors.ink.DEFAULT'),
            backgroundColor: 'transparent',
            border: '0',
            borderLeft: `1px solid ${brand('line')}`,
            borderRight: `1px solid ${brand('line')}`,
            outline: 'none',
          },
        },
 
      });
    }),
  ],
};