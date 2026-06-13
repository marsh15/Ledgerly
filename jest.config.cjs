module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages", "<rootDir>/apps/backend"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@ledgerly/shared$": "<rootDir>/packages/shared/src/index.ts",
    "^@ledgerly/shared/(.*)$": "<rootDir>/packages/shared/src/$1",
    "^@/(.*)$": "<rootDir>/apps/backend/src/$1"
  }
};
