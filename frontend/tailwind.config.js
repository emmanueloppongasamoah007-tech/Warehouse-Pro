/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class', not the 'media' default: NativeWind's setColorScheme throws unless
  // dark mode is class-driven, so the Settings toggle depends on this line.
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
