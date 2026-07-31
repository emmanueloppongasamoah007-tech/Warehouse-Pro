/**
 * Theme tokens (JS) used by Tailwind / NativeWind config.
 * Keep this file JS so it can be required from tailwind.config.cjs
 */
module.exports = {
  colors: {
    primary: {
      DEFAULT: '#005EB8',
      50: '#E9F3FF',
      100: '#D7EBFF',
      200: '#A6D4FF',
      300: '#75BDFF',
      400: '#449FFF',
      500: '#005EB8',
      600: '#004B90',
      700: '#003668',
      800: '#002340',
      900: '#001118'
    },
    secondary: {
      DEFAULT: '#FF6B00',
      50: '#FFF3E6',
      100: '#FFE6CC',
      200: '#FFD199',
      300: '#FFBB66',
      400: '#FFA533',
      500: '#FF6B00',
      600: '#CC5600',
      700: '#993F00',
      800: '#662800',
      900: '#331400'
    },
    tertiary: {
      DEFAULT: '#191C1E'
    },
    neutral: {
      50: '#F8F9FA',
      100: '#F2F4F7',
      200: '#E6E9EC',
      300: '#CED4D9',
      400: '#A6ADB3',
      500: '#6B7278',
      600: '#4A4F53',
      700: '#2F3336',
      800: '#1A1D1F',
      900: '#0B0C0D'
    },
    success: '#28A745',
    danger: '#D64545',
    warning: '#F59E0B',
    info: '#00A3FF'
  },
  spacing: {
    px: '1px',
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    10: '40px'
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    round: '9999px'
  },
  fonts: {
    sans: ['IBMPlexSans-Regular', 'system-ui', 'Helvetica', 'Arial'],
    mono: ['JetBrainsMono-Regular', 'monospace']
  }
};
