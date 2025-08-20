export default {
  transform: {
    "^.+\\.(t|j)s$": "@swc/jest",
  },
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/config/$1",
  },
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "@swc/jest",
  },
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/__tests__/**/*.spec.js",
    "**/*.test.js",
    "**/*.spec.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.js"],
  testTimeout: 20000,
};
