// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/Decoder for jsdom + react-router v7
if (!global.TextEncoder) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  // @ts-expect-error - assigning to global
  global.TextEncoder = TextEncoder;
  // @ts-expect-error - assigning to global
  global.TextDecoder = TextDecoder;
}
