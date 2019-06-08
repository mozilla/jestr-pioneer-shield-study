/* eslint-env commonjs */
/* eslint no-logger: off */
/* eslint no-unused-vars: off */
/* global ExtensionAPI */

ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");

/* eslint-disable no-undef */
const { EventManager } = ExtensionCommon;
const EventEmitter =
  ExtensionCommon.EventEmitter || ExtensionUtils.EventEmitter;

this.testingOverrides = class extends ExtensionAPI {
  getAPI(context) {
    const apiEventEmitter = new EventEmitter();
    return {
      testingOverrides: {
        
      /* @TODO no description given */
      getSlumberStartDayOverride: async function getSlumberStartDayOverride  (  ) {
        console.log("Called getSlumberStartDayOverride()", );
        return undefined;
      },

      /* @TODO no description given */
      getSlumberEndDayOverride: async function getSlumberEndDayOverride  (  ) {
        console.log("Called getSlumberEndDayOverride()", );
        return undefined;
      },

        
      },
    }
  }
}