const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "identity-obj-proxy",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(uuid)/)",
  ],
};

module.exports = createJestConfig(config);
