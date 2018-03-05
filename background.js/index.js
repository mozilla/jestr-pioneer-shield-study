("use strict");

import { storeInDb, initDb } from "./db";
import { startStoringJsInstrumentationResultsInDb } from "./storeDataLeaks";
import { BrowserActionDebugButton } from "./BrowserActionDebugButton";

async function runOnce() {
  // ensure we have configured shieldUtils and are supposed to run our feature
  /*
  await browser.shieldUtils.bootstrapStudy();

  // get study variation
  const { variation } = await browser.shieldUtils.info();
  */

  const variation = {
    name: "foo",
    weight: 1,
  };

  // a button for debugging (tmp)
  new BrowserActionDebugButton(variation);

  // start local study logging
  await initDb();
  await storeInDb("studyLog", { variation: variation.name, event: "run" });
  startStoringJsInstrumentationResultsInDb(variation);
}

/**
 * Fired when a profile that has this extension installed first starts up.
 * This event is not fired when a private browsing/incognito profile is started.
 */
function handleStartup() {
  console.log("handleStartup", arguments);
}

browser.runtime.onStartup.addListener(handleStartup);

/**
 * Fired when the extension is first installed, when the extension is updated
 * to a new version, and when the browser is updated to a new version.
 * @param details
 */
function handleInstalled(details) {
  console.log("handleInstalled", details.reason, details);
}

browser.runtime.onInstalled.addListener(handleInstalled);

// todo: on shutdown
// Run shutdown-related non-privileged code
// Remove db - deleteDb

// actually start
runOnce();
