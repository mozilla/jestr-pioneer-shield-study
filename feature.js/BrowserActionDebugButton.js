import { dumpDbContents } from "./db";

export class BrowserActionDebugButton {
  constructor(variation) {
    console.log("Initializing BrowserActionDebugButton:", variation.name);
    browser.browserAction.onClicked.removeListener(
      this.handleBrowserActionClick,
    );
    browser.browserAction.onClicked.addListener(() =>
      this.handleBrowserActionClick(),
    );
    console.log("initialized");
  }

  async handleBrowserActionClick() {
    console.log("handleBrowserActionClick");
    await dumpDbContents();
  }
}
