// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Set up environment variables for tests
// These are used by the babel transform that converts import.meta.env.X to process.env.X
process.env.VITE_API_URL = 'http://localhost:3001';

// Polyfill TextEncoder/Decoder for jsdom + react-router v7
if (!global.TextEncoder) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
