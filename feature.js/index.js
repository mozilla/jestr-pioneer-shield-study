/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "(feature)" }]*/

("use strict");

import { storeInDb, initDb } from "./db";
import { startStoringJsInstrumentationResultsInDb } from "./storeDataLeaks";
import { BrowserActionDebugButton } from "./BrowserActionDebugButton";

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
    startStoringJsInstrumentationResultsInDb(variation);

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
  }

  sendTelemetry(stringStringMap) {
    browser.study.sendTelemetry(stringStringMap);
  }

  /**
   * Called at end of study, and if the user disables the study or it gets uninstalled by other means.
   */
  async cleanup() {}
}

// make an instance of the feature class available to background.js
window.feature = new Feature();
