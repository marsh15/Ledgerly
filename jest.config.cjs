module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/packages", "<rootDir>/apps/backend"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.base.json" }]
  },
  moduleNameMapper: {
    "^@ledgerly/shared$": "<rootDir>/packages/shared/src/index.ts",
    "^@ledgerly/shared/(.*)$": "<rootDir>/packages/shared/src/$1",
    "^@/(.*)$": "<rootDir>/apps/backend/src/$1"
  }
};
