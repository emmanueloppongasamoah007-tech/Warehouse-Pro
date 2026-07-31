const path = require('path');
const tokens = require(path.join(__dirname, './constants/theme/tokens.js'));

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/nativewind/**/*.js'
  ],
  theme: {
    extend: {
      colors: tokens.colors,
      spacing: tokens.spacing,
      borderRadius: tokens.radii,
      fontFamily: {
        sans: tokens.fonts.sans,
        mono: tokens.fonts.mono,
      }
    },
  },
  plugins: [],
};
