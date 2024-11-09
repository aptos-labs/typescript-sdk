const isBrowserEnvironment = process.env.BROWSER_ENV === "1";

/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: isBrowserEnvironment ? "jsdom" : "node",
  coveragePathIgnorePatterns: [
    "./src/internal/queries/",
    "./src/types/generated",
    "./tests/e2e/ans/publishANSContracts.ts",
  ],
  testPathIgnorePatterns: ["dist/*", "examples/*"],
  collectCoverage: true,
  setupFiles: ["dotenv/config", ...(isBrowserEnvironment ? ["./tests/setupBrowser.js"] : [])],
  coverageThreshold: {
    global: {
      branches: 50, // 90,
      functions: 50, // 95,
      lines: 50, // 95,
      statements: 50, // 95,
    },
  },
  // To help avoid exhausting all the available fds.
  maxWorkers: 4,
  globalSetup: "./tests/preTest.js",
  globalTeardown: "./tests/postTest.js",
};
