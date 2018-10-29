/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(feature)" }]*/
/* global getOpenwpmConfig */

("use strict");

import * as dataReceiver from "./dataReceiver";
import {
  CookieInstrument,
  JavascriptInstrument,
  HttpInstrument,
} from "openwpm-webext-instrumentation";

class Feature {
  constructor() {}

  async configure(studyInfo) {
    const feature = this;
    const { isFirstRun } = studyInfo;

    // perform something only during first run
    if (isFirstRun) {
      // TODO: Cookie telemetry
    }

    // Start OpenWPM instrumentation
    const openwpmConfig = await getOpenwpmConfig();
    this.startOpenWPMInstrumentation(openwpmConfig);
  }

  startOpenWPMInstrumentation(config) {
    if (config["cookie_instrument"]) {
      dataReceiver.logDebug("Cookie instrumentation enabled");
      const cookieInstrument = new CookieInstrument(dataReceiver);
      cookieInstrument.run(config["crawl_id"]);
    }
    if (config["js_instrument"]) {
      dataReceiver.logDebug("Javascript instrumentation enabled");
      const jsInstrument = new JavascriptInstrument(dataReceiver);
      jsInstrument.run(config["crawl_id"]);
    }
    if (config["http_instrument"]) {
      dataReceiver.logDebug("HTTP Instrumentation enabled");
      const httpInstrument = new HttpInstrument(dataReceiver);
      httpInstrument.run(
        config["crawl_id"],
        config["save_javascript"],
        config["save_all_content"],
      );
    }
  }

  /**
   * Called at end of study, and if the user disables the study or it gets uninstalled by other means.
   */
  async cleanup() {}
}

// make an instance of the feature class available to background.js
(window as any).feature = new Feature();
