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

// For devtools messages

/**
 When we receive the message, execute the given script in the given
 tab.
 */
function handleMessage(request, sender, sendResponse) {

  if (sender.url != browser.runtime.getURL("/devtools/panel/panel.html")) {
    return;
  }

  browser.tabs.executeScript(
    request.tabId,
    {
      code: request.script
    });

}

/**
 Listen for messages from our devtools panel.
 */
browser.runtime.onMessage.addListener(handleMessage);

