export const colors = {
    // Primary Brand Colors
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#ffffff',  // main orange
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    
    // Status Colors
    status: {
      new: '#fed7aa',
      pending: '#fef3c7',
      preparing: '#bfdbfe',
      served: '#bbf7d0',
      completed: '#86efac',
    },
    
    // Background Colors
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      hover: '#f9fafb',
    },
    
    // Border Colors
    border: {
      light: '#e5e7eb',
      default: '#d1d5db',
      dark: '#9ca3af',
      primary: '#f97316',
      new: '#fdba74',
      pending: '#fde68a',
      preparing: '#93c5fd',
      served: '#86efac',
    },
    
    // Text Colors
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      tertiary: '#6b7280',
      light: '#9ca3af',
      white: '#ffffff',
      orange: '#f97316',
      red: '#dc2626',
      green: '#16a34a',
    },
    
    // Action Colors
    action: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      secondary: '#3b82f6',
      secondaryHover: '#2563eb',
      success: '#16a34a',
      successHover: '#15803d',
      danger: '#dc2626',
      dangerHover: '#b91c1c',
      warning: '#eab308',
      warningHover: '#ca8a04',
    },
  };
  
  export const spacing = {
    card: '1rem',
    cardLg: '1.5rem',
    section: '1.5rem',
    sectionLg: '2rem',
    item: '0.75rem',
    itemSm: '0.5rem',
  };
  
  export const gap = {
    items: '0.75rem',
    itemsSm: '0.5rem',
    itemsLg: '1rem',
    cards: '1.5rem',
    sections: '2rem',
  };
  
  export const borderRadius = {
    card: '0.75rem',
    cardLg: '1rem',
    button: '0.5rem',
    buttonSm: '0.375rem',
    input: '0.5rem',
    badge: '9999px',
    modal: '0.75rem',
  };
  
  export const boxShadow = {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    cardHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  };
  
  export const transition = {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  };
  
  // Helper function to get status-specific styling
  export const getStatusStyles = (status) => {
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case 'served':
        return {
          bg: colors.status.served,
          border: colors.border.served,
          text: colors.text.green,
        };
      case 'pending':
        return {
          bg: colors.status.pending,
          border: colors.border.pending,
          text: colors.action.warning,
        };
      case 'preparing':
        return {
          bg: colors.status.preparing,
          border: colors.border.preparing,
          text: colors.action.secondary,
        };
      case 'new':
        return {
          bg: colors.status.new,
          border: colors.border.new,
          text: colors.text.orange,
        };
      default:
        return {
          bg: colors.bg.primary,
          border: colors.border.light,
          text: colors.text.primary,
        };
    }
  };
  
  export default {
    colors,
    spacing,
    gap,
    borderRadius,
    boxShadow,
    transition,
    getStatusStyles,
  };