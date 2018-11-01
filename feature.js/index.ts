/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(feature)" }]*/
/* global getOpenwpmConfig */

("use strict");

declare namespace browser.studyDebug {
  function getInternals(): any;
}

declare namespace browser.downloads {
  function download(options: any): any;
}

import * as dataReceiver from "./dataReceiver";
import {
  CookieInstrument,
  JavascriptInstrument,
  HttpInstrument,
  NavigationInstrument,
} from "openwpm-webext-instrumentation";
// import { telemetrySender } from "./telemetrySender";

class Feature {
  private navigationInstrument;
  private cookieInstrument;
  private jsInstrument;
  private httpInstrument;

  constructor() {}

  async configure(studyInfo) {
    const feature = this;
    const { isFirstRun } = studyInfo;

    // perform something only during first run
    if (isFirstRun) {
      // TODO: Cookie telemetry
      /*
        // link with storeId
        const cookieStores = await browser.cookies.getAllCookieStores();
        console.log("cookieStores", cookieStores);

        // link with name
        const matchingCookies = await browser.cookies.getAll({
          name: cookie.name,
          storeId: cookie.storeId,
        });
        console.log("matchingCookies", matchingCookies);
       */
    }

    // Start OpenWPM instrumentation
    const openwpmConfig = await getOpenwpmConfig();
    this.startOpenWPMInstrumentation(openwpmConfig);

    // Start Pioneer telemetry export helper
    console.log("browser.studyDebug", browser.studyDebug);
    if (browser.studyDebug) {
      console.debug("Will export seen telemetry in 10s");
      const exportSeenTelementry = async () => {
        console.debug("Exporting seen telemetry");
        const internals = await browser.studyDebug.getInternals();
        console.debug("internals", internals);
        const json = JSON.stringify(internals.seenTelemetry);
        const blob = new Blob([json], {
          type: "application/json;charset=utf-8",
        });
        console.debug("foo");
        browser.downloads.download({
          url: URL.createObjectURL(blob),
          filename: "seenTelemetry.json",
        });
      };
      // TODO: onNavigation to specific url instead of setTimeout
      setTimeout(exportSeenTelementry, 1000 * 10);
    }
  }

  startOpenWPMInstrumentation(config) {
    if (config["navigation_instrument"]) {
      this.navigationInstrument = new NavigationInstrument(dataReceiver);
      this.navigationInstrument.run(config["crawl_id"]);
    }
    if (config["cookie_instrument"]) {
      dataReceiver.logDebug("Cookie instrumentation enabled");
      this.cookieInstrument = new CookieInstrument(dataReceiver);
      this.cookieInstrument.run(config["crawl_id"]);
    }
    if (config["js_instrument"]) {
      dataReceiver.logDebug("Javascript instrumentation enabled");
      this.jsInstrument = new JavascriptInstrument(dataReceiver);
      this.jsInstrument.run(config["crawl_id"]);
    }
    if (config["http_instrument"]) {
      dataReceiver.logDebug("HTTP Instrumentation enabled");
      this.httpInstrument = new HttpInstrument(dataReceiver);
      this.httpInstrument.run(
        config["crawl_id"],
        config["save_javascript"],
        config["save_all_content"],
      );
    }
  }

  /**
   * Called at end of study, and if the user disables the study or it gets uninstalled by other means.
   */
  async cleanup() {
    if (this.navigationInstrument) {
      await this.navigationInstrument.cleanup();
    }
    if (this.cookieInstrument) {
      await this.cookieInstrument.cleanup();
    }
    if (this.jsInstrument) {
      await this.jsInstrument.cleanup();
    }
    if (this.httpInstrument) {
      await this.httpInstrument.cleanup();
    }
  }
}

// make an instance of the feature class available to background.js
(window as any).feature = new Feature();
