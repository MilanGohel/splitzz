/** @type {import('jest').Config} */
const config = {
    displayName: 'splitzz',
    testEnvironment: 'node',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

    // Test patterns
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/tests/**/*.test.tsx',
    ],

    // Module resolution (path aliases)
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/tests/(.*)$': '<rootDir>/tests/$1',
    },

    // Coverage settings
    collectCoverageFrom: [
        'app/api/**/*.ts',
        'lib/**/*.ts',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },

    // TypeScript transformation
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: false,
        }],
    },

    // Clear mocks between tests
    clearMocks: true,

    // Test timeout for database operations
    testTimeout: 30000,

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

module.exports = config;
