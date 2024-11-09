const { TextDecoder, TextEncoder } = require("util");

// Import fetch for browser environment
require("whatwg-fetch");
global.XMLHttpRequest = require("xhr2");

const textEncoder = new TextEncoder();
class ESBuildAndJSDOMCompatibleTextEncoder extends TextEncoder {
  encode(input) {
    const arr = textEncoder.encode(input);
    return new Uint8Array(arr.buffer);
  }
}

// Import TextDecoder and TextEncoder for browser environment
global.TextEncoder = ESBuildAndJSDOMCompatibleTextEncoder;
global.TextDecoder = TextDecoder;
