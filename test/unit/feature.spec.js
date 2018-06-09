/* eslint-env node, mocha, chai */
/* global browser, sinon, assert, Feature */

"use strict";

describe("feature.js", function() {
  describe("window.feature", function() {
    it("should exist", function() {
      assert.exists(window.feature);
    });
  });
});
