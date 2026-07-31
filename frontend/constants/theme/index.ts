// TypeScript wrapper around the JS tokens file so app code can import tokens
const tokens = require('./tokens.js');

export const theme = tokens as typeof tokens;

export type Theme = typeof theme;

export default theme;
