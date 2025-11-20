import theme from '../Color&StylesManager/theme';


export function injectThemeVars() {
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([group, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--color-${group}`, value);
    } else {
      Object.entries(value).forEach(([k, v]) => {
        const key = k === 'default' ? 'default' : k;
        root.style.setProperty(`--color-${group}-${key}`, v);
      });
    }
  });

  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([k, v]) => {
      root.style.setProperty(`--spacing-${k}`, v);
    });
  }
  if (theme.borderRadius) {
    Object.entries(theme.borderRadius).forEach(([k, v]) => {
      root.style.setProperty(`--radius-${k}`, v);
    });
  }

  if (theme.boxShadow) {
    Object.entries(theme.boxShadow).forEach(([k, v]) => {
      root.style.setProperty(`--shadow-${k}`, v);
    });
  }
}
