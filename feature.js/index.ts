/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(feature)" }]*/
/* global getOpenwpmConfig */

("use strict");

declare namespace browser.study {
  const logger: any;
  function endStudy(_: any);
}

declare namespace browser.studyDebug {
  function getInternals(): any;
}

declare namespace browser.privacyContext {
  function permanentPrivateBrowsing(): boolean;
  function aPrivateBrowserWindowIsOpen(): boolean;
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
  private openwpmCrawlId;

  constructor() {}

  async configure(studyInfo) {
    const feature = this;
    const { isFirstRun } = studyInfo;

    // Users with private browsing on autostart should not continue being in the study
    if (await browser.privacyContext.permanentPrivateBrowsing()) {
      await browser.study.logger.log(
        "Permanent private browsing, exiting study",
      );
      await browser.study.endStudy({ reason: "ineligible" });
      return;
    }

    // Start OpenWPM instrumentation
    const openwpmConfig = await getOpenwpmConfig();
    await this.startOpenWPMInstrumentation(openwpmConfig, isFirstRun);

    // Start Pioneer telemetry export helper
    /*
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
    */
  }

  async startOpenWPMInstrumentation(config, isFirstRun) {
    dataReceiver.activeTabDwellTimeMonitor.run();
    dataReceiver.studyPayloadPreprocessor.run();
    this.openwpmCrawlId = config["crawl_id"];
    if (config["navigation_instrument"]) {
      this.navigationInstrument = new NavigationInstrument(dataReceiver);
      this.navigationInstrument.run(config["crawl_id"]);
    }
    if (config["cookie_instrument"]) {
      dataReceiver.logDebug("Cookie instrumentation enabled");
      this.cookieInstrument = new CookieInstrument(dataReceiver);
      /*
      if (isFirstRun) {
        await this.cookieInstrument.saveAllCookies(config["crawl_id"]);
        dataReceiver.logDebug("Cookies saved (first run)");
      }
      */
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
      /*
      await this.cookieInstrument.saveAllCookies(this.openwpmCrawlId);
      dataReceiver.logDebug("Cookies saved (study end)");
      */
      await this.cookieInstrument.cleanup();
    }
    if (this.jsInstrument) {
      await this.jsInstrument.cleanup();
    }
    if (this.httpInstrument) {
      await this.httpInstrument.cleanup();
    }
    if (dataReceiver.activeTabDwellTimeMonitor) {
      dataReceiver.activeTabDwellTimeMonitor.cleanup();
    }
    if (dataReceiver.studyPayloadPreprocessor) {
      dataReceiver.studyPayloadPreprocessor.cleanup();
    }
  }
}

// make an instance of the feature class available to background.js
(window as any).feature = new Feature();
