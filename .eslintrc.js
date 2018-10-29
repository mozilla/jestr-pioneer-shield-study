/* eslint-env node */

"use strict";

// All Mozilla specific rules and environments at:
// http://firefox-source-docs.mozilla.org/tools/lint/linters/eslint-plugin-mozilla.html

module.exports = {
  env: {
    es6: true,
  },
  extends: [
    "eslint:recommended",
    // list of rules at: https://dxr.mozilla.org/mozilla-central/source/tools/lint/eslint/eslint-plugin-mozilla/lib/configs/recommended.js
    "plugin:mozilla/recommended",
  ],
  overrides: [
    {
      files: "src/**",
      env: {
        browser: true,
        webextensions: true,
      },
    },
  ],

  parser: "typescript-eslint-parser",

  parserOptions: {
    ecmaVersion: 8,
    sourceType: "module",
    ecmaFeatures: {
      jsx: false,
      experimentalObjectRestSpread: true,
    },
  },
  plugins: ["json", "mozilla", "typescript"],
  root: true,
  rules: {
    "babel/new-cap": "off",
    "mozilla/no-aArgs": "warn",
    "mozilla/balanced-listeners": "off",
    "comma-dangle": ["error", "always-multiline"],
    eqeqeq: "error",
    indent: ["warn", 2, { SwitchCase: 1 }],
    "max-len": [
      "warn",
      {
        code: 100,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    "no-console": "warn",
    "no-shadow": "error",
    "no-var": "error",
    "prefer-const": "warn",
    "prefer-spread": "error",
    semi: ["error", "always"],
    "valid-jsdoc": "warn",

    "no-return-await": ["off"],

    // The following rules do not work with Typescript
    "no-undef": ["off"], // https://github.com/eslint/typescript-eslint-parser/issues/77
    "no-unused-vars": ["off"], // https://github.com/eslint/typescript-eslint-parser/issues/77
    "no-useless-constructor": ["off"], // https://github.com/eslint/typescript-eslint-parser/issues/77
    "space-infix-ops": ["off"], // https://github.com/eslint/typescript-eslint-parser/issues/224
  },
};
