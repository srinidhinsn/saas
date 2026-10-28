import plugin from 'tailwindcss/plugin';

/* ======================================================================
   THEME SWITCH — the ONLY place to change the app's accent colour.
   Swap the active palette below; every brand-*, ui-* class, shadow and
   gradient follows. (Table state colours stay as-is on purpose:
   green/red/amber must keep their meaning.)

   Every value in PURPLE is lifted from the analytics style.css (V9–V12).
   ====================================================================== */
const PURPLE = {
  DEFAULT: '#7953a7', dark: '#69458f', darker: '#55347c',
  light: '#f5f0f9', soft: '#e9ddf5', line: '#e1d4ee',
  ring: '#a47dc9', tint: '#faf7fd',
  edge: '#eee6f7',                 // 2px top edge on panels
  shadowRgb: '60,35,95',
  // --- analytics-specific extras ---
  tableLine: '#e5d9f0',            // th border + toggle track border
  tabLine: '#e7deef',              // tab bar bottom border
  filterLine: '#decdec',           // filter box border
  filterLabel: '#695284',          // filter small label
  filterText: '#49345e',           // filter value text
  filterShadowRgb: '90,55,135',    // filter box shadow
  focus: '#e8daf5',                // focus ring around filter / input
  segShadow: '#39204c24',          // active segmented-toggle shadow
  pill: '#f1ebf6',                 // small pill background
  scale: { 50: '#f5f0f9', 100: '#e9ddf5', 200: '#d9c5ec', 300: '#c2a3de', 400: '#a47dc9', 500: '#8f66b8', 600: '#7953a7', 700: '#69458f', 800: '#55347c', 900: '#3f2660' },
};
const ORANGE = {
  DEFAULT: '#e8742a', dark: '#b94f12', darker: '#8f3b0a',
  light: '#fff4ec', soft: '#fde3d0', line: '#f8d2b8',
  ring: '#f09a5c', tint: '#fffaf6',
  edge: '#fbe9dc',
  shadowRgb: '120,60,20',
  tableLine: '#f5dcc9',
  tabLine: '#f3e2d4',
  filterLine: '#f3cfb4',
  filterLabel: '#8f5a34',
  filterText: '#5c3418',
  filterShadowRgb: '135,75,40',
  focus: '#fbe3d0',
  segShadow: '#5a2d0f24',
  pill: '#fbeadd',
  scale: { 50: '#fff4ec', 100: '#fde3d0', 200: '#f8cdb0', 300: '#f4ae82', 400: '#f09a5c', 500: '#ec8540', 600: '#e8742a', 700: '#b94f12', 800: '#8f3b0a', 900: '#662a07' },
};
const FONT = 'Inter, "Segoe UI", Arial, sans-serif';   // the one font stack
const THEME = PURPLE;   // <-- change to ORANGE to switch the whole app

/* ======================================================================
   ORIGINAL (legacy) button colour codes — kept exactly as they were.
   Used by the old `action.*`, `bulkActions.*`, `bulkActionsHover.*` tokens
   below and by the CLASSIC button preset.
   ====================================================================== */
const LEGACY = {
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
   ANALYTICS NEUTRALS — greys/blues used by style.css for text & borders.
   ====================================================================== */
const NEUTRAL = {
  label: '#637789',      // metric label
  note: '#7b8c9c',       // metric note / small captions
  tab: '#5e7083',        // inactive tab text
  tabHoverBg: '#f5f7f9', // tab hover background
  tabHover: '#644c82',   // tab hover text
  toggle: '#5c5662',     // inactive segmented-toggle text
  hint: '#718295',       // storyHint text
  rowAlt: '#fbfcfd',     // zebra row
  errBg: '#fff0f0',      // error banner
  errText: '#a8423a',
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
  delete: { bg: THEME.light, text: THEME.dark, border: THEME.line, hover: THEME.soft, hoverText: THEME.dark },
  add: { bg: THEME.DEFAULT, text: '#ffffff', border: THEME.DEFAULT, hover: THEME.dark, hoverText: '#ffffff' },
};
const BTN_CLASSIC = {       // the original colour codes, button by button
  config: { bg: LEGACY.success, text: LEGACY.textWhite, border: LEGACY.success, hover: LEGACY.success, hoverText: LEGACY.textWhite },
  update: { bg: THEME.DEFAULT, text: LEGACY.textWhite, border: THEME.DEFAULT, hover: LEGACY.updateHover, hoverText: LEGACY.textPrimary },
  delete: { bg: LEGACY.delete, text: LEGACY.textWhite, border: LEGACY.delete, hover: LEGACY.deleteHover, hoverText: LEGACY.textPrimary },
  add: { bg: LEGACY.adding, text: LEGACY.textWhite, border: LEGACY.adding, hover: LEGACY.addingHover, hoverText: LEGACY.textPrimary },
};
const BUTTONS = BTN_ANALYTICS;   // <-- change to BTN_CLASSIC for the original colours

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
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out both',
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
          pending: 'yellow',
          preparing: 'blue',
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

        /* ================= Analytics design standards ================= */

        // Brand purple (analytics primary)
        brand: {
          DEFAULT: THEME.DEFAULT,  // primary buttons, active accents, active tab underline
          dark: THEME.dark,        // headings, KPI values, text on light surface
          darker: THEME.darker,    // active toggle text
          light: THEME.light,      // light surface (buttons, toggle track, th, hover)
          soft: THEME.soft,        // hover / active surface
          line: THEME.line,        // tinted borders
          ring: THEME.ring,        // focus ring / focus border
          tint: THEME.tint,        // top of KPI gradient
          edge: THEME.edge,
          'table-line': THEME.tableLine,
          'tab-line': THEME.tabLine,
          pill: THEME.pill,
          focus: THEME.focus,
          ...THEME.scale,          // brand-50 … brand-900 (landing page)
        },

        // Toolbar buttons (from BUTTONS above): bg-btn-config, text-btn-update-text, ...
        btn: Object.fromEntries(Object.entries(BUTTONS).map(([k, v]) => [k, {
          DEFAULT: v.bg, text: v.text, line: v.border, hover: v.hover, 'hover-text': v.hoverText,
        }])),

        // Landing page tokens (index.css .lp-* classes)
        page: '#f8f7fb',          // bg-page
        copy: '#4b5563',          // text-copy (body text)
        soft: THEME.light,        // bg-soft
        success: { DEFAULT: '#15803d', soft: '#dcfce7', line: '#bbf7d0' },
        warning: { DEFAULT: '#a16207', soft: '#fef9c3', line: '#fde68a' },

        // Page canvas — body background in analytics
        canvas: '#f3f6f9',
        surface: '#ffffff',      // card / panel / modal background

        // Destructive actions (delete). Separate from table state 'occupied'.
        danger: { DEFAULT: THEME.DEFAULT, bg: THEME.light, border: THEME.line, hover: THEME.dark },

        // Text
        ink: {
          DEFAULT: '#17283b',  // main text
          soft: '#354b60',     // secondary text / table cells
          muted: '#6d7f90',    // captions, hints
          faint: '#8d9aa8',    // placeholders
          label: NEUTRAL.label,   // metric label
          note: NEUTRAL.note,     // metric note
          tab: NEUTRAL.tab,       // inactive tab
          toggle: NEUTRAL.toggle, // inactive toggle button
          hint: NEUTRAL.hint,
        },

        // Neutral borders / dividers
        line: {
          DEFAULT: '#dbe5ec',
          soft: '#e9eff3',
          divider: '#e1e8ef',
          strong: '#c9d3dc',   // border-line-strong
          panel: THEME.edge,    // 2px top edge on panels
        },

        // Table state colours (vacant / occupied / reserved / other)
        state: {
          vacant: { DEFAULT: '#1d9e6a', bg: '#e7f6ee' },
          occupied: { DEFAULT: '#c9473d', bg: '#fdeceb', border: '#f0c9c5', hover: '#b03a31' },
          reserved: { DEFAULT: '#b7791f', bg: '#fdf3dc' },
          other: { DEFAULT: '#2879bd', bg: '#e8f1fa' },
        },

        backdrop: 'rgba(20,16,35,0.48)',   // analytics modal backdrop
      },

      fontFamily: {
        sans: FONT,
        inter: FONT,                       // font-inter
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },

      /* ===== SPACING SYSTEM ===== */
      spacing: {
        'card': '1rem',
        'card-lg': '1.5rem',
        'section': '1.5rem',
        'section-lg': '2rem',
        'item': '0.75rem',
        'item-sm': '0.5rem',
        // Analytics (all values taken from style.css)
        'panel': '12px',          // .panel padding
        'stack': '9px',           // .panel margin-bottom
        'page-x': '22px',         // main padding-x
        'page-y': '12px',         // gap between tab bar and first content
        'page-b': '28px',         // main padding-bottom
        'modal': '20px',          // .dateModal padding
        'tile': '10px',           // .metric vertical padding
        'dot': '6px',             // status dot in chips
        'tab-x': '18px',          // .topTabs horizontal padding
      },

      gap: {
        'items': '0.75rem',
        'items-sm': '0.5rem',
        'items-lg': '1rem',
        'cards': '1.5rem',
        'sections': '2rem',
        'tiles': '10px',          // gap between KPI / table tiles
        'tabs': '5px',            // gap between tabs
      },

      borderRadius: {
        'card': '0.75rem',
        'card-lg': '1rem',
        'button': '0.5rem',
        'button-sm': '7px',       // .refresh / .subtle radius
        'input': '0.5rem',
        'badge': '9999px',
        'modal': '0.75rem',
        'panel': '9px',           // analytics cards / panels / metrics / filters
        'modal-lg': '13px',       // analytics modal
        'seg': '6px',             // segmented-toggle buttons
        'toggle': '9px',          // segmented-toggle container
        'tab': '7px',             // tab button
        'btn': '0.625rem',        // rounded-btn (landing page buttons)
      },

      height: { control: '36px' },          // buttons + inputs
      minHeight: { metric: '82px', tabs: '48px' },
      maxWidth: { modal: '420px', page: '1680px' },
      gridTemplateColumns: {
        kpi: 'repeat(auto-fit,minmax(165px,1fr))',     // KPI row (.metrics)
        tiles: 'repeat(auto-fill,minmax(168px,1fr))',  // table cards
      },

      borderWidth: {
        'default': '1px',
        'bar': '3px',             // coloured top edge on KPI / table cards, tab underline
        'panel': '2px',
      },

      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'button': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        // Analytics
        'panel': '0 2px 7px rgba(22,53,73,0.045)',
        'panel-hover': `0 4px 14px rgba(${THEME.shadowRgb},0.10)`,
        'seg-active': `0 1px 3px ${THEME.segShadow}`,
        'tabs': '0 4px 10px rgba(23,50,72,0.06)',
        'filter': `0 1px 3px rgba(${THEME.filterShadowRgb},0.06)`,
        'modal-lg': '0 25px 70px rgba(22,15,43,0.25)',
        'soft': `0 8px 24px rgba(${THEME.shadowRgb},0.10)`,   // shadow-soft
        'focus-ring': `0 0 0 2px ${THEME.focus}`,
      },

      backgroundImage: {
        'metric': `linear-gradient(180deg, ${THEME.tint}, #ffffff 65%)`,
      },

      fontSize: {
        'heading-xl': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-md': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
        // Analytics type scale (px values straight from style.css)
        'page-title': ['1.25rem', { lineHeight: '1.3', fontWeight: '750' }],      // 20px  .ownerIntro h2
        'panel-title': ['0.84375rem', { lineHeight: '1.4', fontWeight: '750' }],  // 13.5px .panel h3
        'kpi': ['1.25rem', { lineHeight: '1.2', fontWeight: '700' }],             // 20px  .metric strong
        'metric-label': ['0.59375rem', { lineHeight: '1.4' }],                    // 9.5px .metric span
        'metric-note': ['0.575rem', { lineHeight: '1.4' }],                       // 9.2px .metric small
        'table': ['0.66875rem', { lineHeight: '1.4' }],                           // 10.7px table
        'tab': ['0.8333rem', { lineHeight: '1.3' }],                              // 13.33px tab button
        'ui': ['0.75rem', { lineHeight: '1.5' }],                                 // 12px
        'ui-sm': ['0.6875rem', { lineHeight: '1.5' }],                            // 11px
        'micro': ['0.625rem', { lineHeight: '1.4' }],                             // 10px
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

    /* ===== Reusable analytics-style components =====
       ui-page, ui-panel, ui-panel-title, ui-metrics, ui-metric(+label/value/note),
       ui-tabs / ui-tab, ui-toggle, ui-filter, ui-btn*, ui-input, ui-table,
       ui-pill, ui-chip, ui-error, ui-hint, ui-modal, ui-backdrop            */
    plugin(function ({ addComponents, theme }) {
      const brand = (k) => theme(`colors.brand.${k}`);
      // fontSize entries can be a string or [size, options] depending on version
      const fs = (k) => [].concat(theme(`fontSize.${k}`))[0];
      addComponents({
        /* ---------- page ---------- */
        '.ui-page': {
          fontFamily: FONT,
          backgroundColor: theme('colors.canvas'),
          color: theme('colors.ink.DEFAULT'),
          minHeight: '100vh',
          maxWidth: theme('maxWidth.page'),
          margin: '0 auto',
          padding: `${theme('spacing.page-y')} ${theme('spacing.page-x')} ${theme('spacing.page-b')}`,
        },

        /* ---------- panel (.panel) ---------- */
        '.ui-panel': {
          backgroundColor: theme('colors.surface'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderTop: `${theme('borderWidth.panel')} solid ${theme('colors.line.panel')}`,
          borderRadius: theme('borderRadius.panel'),
          boxShadow: theme('boxShadow.panel'),
          padding: theme('spacing.panel'),
          marginBottom: theme('spacing.stack'),
          minWidth: '0',
        },
        '.ui-panel-title': {
          fontSize: fs('panel-title'),
          fontWeight: '750',
          color: brand('dark'),
          margin: '0 0 7px',
        },

        /* ---------- KPI band (.metrics / .metric) ---------- */
        '.ui-metrics': {
          display: 'grid',
          gridTemplateColumns: theme('gridTemplateColumns.kpi'),
          gap: theme('gap.tiles'),
          marginBottom: '16px',
        },
        '.ui-metric': {
          minWidth: '0',
          backgroundImage: theme('backgroundImage.metric'),
          border: `1px solid ${theme('colors.line.DEFAULT')}`,
          borderTop: `${theme('borderWidth.bar')} solid ${brand('soft')}`,
          borderRadius: theme('borderRadius.panel'),
          boxShadow: theme('boxShadow.panel'),
          padding: `${theme('spacing.tile')} ${theme('spacing.item')}`,
          minHeight: theme('minHeight.metric'),
        },
        '.ui-metric-label': {
          display: 'block',
          fontSize: fs('metric-label'),
          fontWeight: '600',
          color: theme('colors.ink.label'),
        },
        '.ui-metric-value': {
          display: 'block',
          fontSize: fs('kpi'),
          fontWeight: '700',
          color: brand('dark'),
          margin: '4px 0',
          overflowWrap: 'anywhere',
        },
        '.ui-metric-note': {
          display: 'block',
          fontSize: fs('metric-note'),
          color: theme('colors.ink.note'),
        },

        /* ---------- tab bar (.topTabs) ---------- */
        '.ui-tabs': {
          display: 'flex',
          alignItems: 'center',
          gap: theme('gap.tabs'),
          minHeight: theme('minHeight.tabs'),
          padding: `8px ${theme('spacing.tab-x')}`,
          backgroundColor: theme('colors.surface'),
          overflowX: 'auto',
          marginBottom: theme('spacing.item'),
        },
        '.ui-tab': {
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          flexShrink: '0',
          whiteSpace: 'nowrap',
          border: '0',
          borderBottom: `${theme('borderWidth.bar')} solid transparent`,
          borderRadius: theme('borderRadius.tab'),
          backgroundColor: 'transparent',
          color: theme('colors.ink.tab'),
          fontSize: fs('tab'),
          fontWeight: '650',
          lineHeight: '1.3',
          padding: '8px 12px',
          cursor: 'pointer',
          '&:hover': { backgroundColor: NEUTRAL.tabHoverBg, color: NEUTRAL.tabHover },
        },
        '.ui-tab-active, .ui-tab-active:hover': {
          color: brand('dark'),
          borderBottomColor: brand('DEFAULT'),
          backgroundColor: brand('light'),
        },

        /* ---------- segmented toggle (.opsToggle) ---------- */
        '.ui-toggle': {
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: '2px',
          padding: '3px',
          backgroundColor: brand('light'),
          border: `1px solid ${THEME.tableLine}`,
          borderRadius: theme('borderRadius.toggle'),
        },
        '.ui-toggle-btn': {
          border: '0',
          backgroundColor: 'transparent',
          borderRadius: theme('borderRadius.seg'),
          padding: '6px 12px',
          fontSize: fs('tab'),
          fontWeight: '650',
          color: theme('colors.ink.toggle'),
          cursor: 'pointer',
        },
        '.ui-toggle-btn-active': {
          backgroundColor: brand('soft'),
          color: brand('darker'),
          boxShadow: theme('boxShadow.seg-active'),
        },

        /* ---------- filter box (.multiFilter) ---------- */
        '.ui-filter': {
          minWidth: '0',
          backgroundColor: brand('light'),
          border: `1px solid ${THEME.filterLine}`,
          borderRadius: theme('borderRadius.panel'),
          padding: '7px 10px',
          boxShadow: theme('boxShadow.filter'),
          '&:focus-within': { borderColor: brand('ring'), boxShadow: theme('boxShadow.focus-ring') },
        },
        '.ui-filter-label': {
          display: 'block',
          fontSize: fs('micro'),
          fontWeight: '750',
          color: THEME.filterLabel,
          marginBottom: '3px',
        },
        '.ui-filter-control': {
          width: '100%',
          border: '0',
          outline: '0',
          backgroundColor: 'transparent',
          fontSize: fs('ui-sm'),
          fontWeight: '650',
          color: THEME.filterText,
        },

        /* ---------- buttons (.refresh / .subtle) ---------- */
        '.ui-btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: theme('height.control'),
          padding: '0 12px',
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: brand('light'),
          color: brand('dark'),
          fontSize: fs('ui-sm'),
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

        /* ---------- form input (.storySearch / .dateModal input) ---------- */
        '.ui-input': {
          width: '100%',
          height: theme('height.control'),
          padding: `0 ${theme('spacing.item')} 0 2rem`,
          border: `1px solid ${brand('line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          backgroundColor: theme('colors.surface'),
          fontSize: fs('ui-sm'),
          color: theme('colors.ink.DEFAULT'),
          outline: 'none',
          '&::placeholder': { color: theme('colors.ink.faint') },
          '&:focus': { borderColor: brand('ring'), boxShadow: theme('boxShadow.focus-ring') },
        },

        /* ---------- table (table / th / td) ---------- */
        '.ui-table-wrap': {
          maxHeight: '510px',
          overflow: 'auto',
        },
        '.ui-table': {
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0',
          fontSize: fs('table'),
          marginTop: '7px',
          '& th': {
            position: 'sticky',
            top: '0',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            fontWeight: '700',
            padding: '7px 8px',
            backgroundColor: brand('light'),
            color: brand('dark'),
            borderTop: `1px solid ${THEME.tableLine}`,
            borderBottom: `1px solid ${THEME.tableLine}`,
          },
          '& th:first-child': { borderLeft: `1px solid ${THEME.tableLine}`, borderRadius: '6px 0 0 0' },
          '& th:last-child': { borderRight: `1px solid ${THEME.tableLine}`, borderRadius: '0 6px 0 0' },
          '& td': {
            padding: '7px 8px',
            verticalAlign: 'top',
            backgroundColor: theme('colors.surface'),
            color: theme('colors.ink.soft'),
            borderBottom: `1px solid ${theme('colors.line.soft')}`,
          },
          '& tbody tr:nth-child(even) td': { backgroundColor: NEUTRAL.rowAlt },
          '& tbody tr:hover td': { backgroundColor: brand('light') },
        },

        /* ---------- small pill (.pill) & status chip ---------- */
        '.ui-pill': {
          display: 'inline-block',
          whiteSpace: 'nowrap',
          borderRadius: theme('borderRadius.badge'),
          padding: '4px 8px',
          fontSize: fs('metric-label'),
          fontWeight: '700',
          backgroundColor: brand('pill'),
          color: brand('dark'),
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

        /* ---------- messages ---------- */
        '.ui-error': {
          padding: '10px 12px',
          backgroundColor: theme('colors.brand.light'),
          color: theme('colors.brand.dark'),
          border: `1px solid ${theme('colors.brand.line')}`,
          borderRadius: theme('borderRadius.button-sm'),
          marginBottom: theme('spacing.stack'),
        },
        '.ui-hint': {
          fontSize: fs('ui-sm'),
          lineHeight: '1.55',
          color: theme('colors.ink.hint'),
          margin: '6px 0',
        },

        /* ---------- modal (.dateModal) ---------- */
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
      });
    }),
  ],
};