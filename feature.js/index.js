/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(feature)" }]*/
/* global getOpenwpmConfig */

("use strict");

import { storeInDb, initDb } from "./db";
import * as dataReceiver from "./dataReceiver";
import { BrowserActionDebugButton } from "./BrowserActionDebugButton";
import { TabsMonitor } from "./TabsMonitor";
import { CookieInstrument, JavascriptInstrument, HttpInstrument } from "openwpm-webext-instrumentation";

class Feature {
  constructor() {}

  async configure(studyInfo) {
    const feature = this;
    const { variation, isFirstRun } = studyInfo;

    // a button for debugging (tmp)
    new BrowserActionDebugButton(variation);

    // start local study logging
    await initDb();
    await storeInDb("studyLog", { variation: variation.name, event: "run" });

    // For devtools messages

    /**
     When we receive the message, execute the given script in the given
     tab.
     */
    function handleMessage(request, sender) {
      if (sender.url !== browser.runtime.getURL("/devtools/panel/panel.html")) {
        return;
      }

      browser.tabs.executeScript(request.tabId, {
        code: request.script,
      });
    }

    /**
     Listen for messages from our devtools panel.
     */
    browser.runtime.onMessage.addListener(handleMessage);

    // perform something only during first run
    if (isFirstRun) {
      await storeInDb("studyLog", {
        variation: variation.name,
        event: "firstRun",
      });
    }

    // Start OpenWPM instrumentation
    const openwpmConfig = await getOpenwpmConfig();
    this.startOpenWPMInstrumentation(openwpmConfig);

    // Monitor tabs
    this.tabsMonitor = new TabsMonitor();
    this.tabsMonitor.configure(feature);
  }

  sendTelemetry(stringStringMap) {
    browser.study.sendTelemetry(stringStringMap);
  }

  startOpenWPMInstrumentation(config) {
    if (config['cookie_instrument']) {
      dataReceiver.logDebug("Cookie instrumentation enabled");
      const cookieInstrument = new CookieInstrument(dataReceiver);
      cookieInstrument.run(config['crawl_id']);
    }
    if (config['js_instrument']) {
      dataReceiver.logDebug("Javascript instrumentation enabled");
      const jsInstrument = new JavascriptInstrument(dataReceiver);
      jsInstrument.run(config['crawl_id']);
    }
    if (config['http_instrument']) {
      dataReceiver.logDebug("HTTP Instrumentation enabled");
      const httpInstrument = new HttpInstrument(dataReceiver);
      httpInstrument.run(config['crawl_id'], config['save_javascript'],
        config['save_all_content']);
    }
  }

  /**
   * Called at end of study, and if the user disables the study or it gets uninstalled by other means.
   */
  async cleanup() {
    await this.tabsMonitor.cleanup();
  }

}

// make an instance of the feature class available to background.js
window.feature = new Feature();
