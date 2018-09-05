export class TabsMonitor {
  configure(feature) {
    this.feature = feature;
    this.monitoredTabIds = new Set();
    this.tabActivatedListener = this.handleActivated.bind(this);
    this.tabCreatedListener = this.handleCreated.bind(this);
    this.tabUpdatedListener = this.handleUpdated.bind(this);
    this.tabRemovedListener = this.handleRemoved.bind(this);

    browser.tabs.onActivated.addListener(this.tabActivatedListener);
    browser.tabs.onCreated.addListener(this.tabCreatedListener);
    browser.tabs.onUpdated.addListener(this.tabUpdatedListener);
    browser.tabs.onRemoved.addListener(this.tabRemovedListener);
  }

  clear() {
    browser.tabs.onActivated.removeListener(this.tabActivatedListener);
    browser.tabs.onCreated.removeListener(this.tabCreatedListener);
    browser.tabs.onUpdated.removeListener(this.tabUpdatedListener);
    browser.tabs.onRemoved.removeListener(this.tabRemovedListener);
  }

  async handleActivated(activeInfo) {
    console.log("handleActivated", activeInfo);

    // this.monitoredTabIds
  }

  async handleCreated(tab) {
    console.log("handleCreated", tab);
    const tabs = await browser.tabs.query({});
    console.log("handleCreated - browser.tabs.query() result", tabs);
    console.log("Enabling network monitoring for tab since the tab has been created");
    // Note that due to how Firefox moves out tabs to separate processes, the tab object we start monitoring here
    // may be destroyed upon further navigation. This is why we also enable network monitoring on events indicating updated tabs
    await browser.openwpm.enableNetworkMonitorForTab(tab.id);
  }

  async handleUpdated(tabId, changeInfo, tab) {
    console.log("handleUpdated", tabId, changeInfo, tab);
    if (changeInfo.length === 1 && changeInfo.status === "loading") {
      console.log("Enabling network monitoring for tab since the status is 'loading'");
      await browser.openwpm.enableNetworkMonitorForTab(tabId);
    }
    if (changeInfo.status === "complete") {
      console.log("Dumping HAR for tab since the status is 'complete'");
      const har = await browser.openwpm.getHarForTab(tabId);
      console.log(
        "handleUpdated - HAR from await browser.openwpm.getHarForTab(tabId)",
        har,
      );
      setTimeout(async() => {
        console.log("Dumping HAR for tab since the status was 'complete' 5 seconds ago");
        const har = await browser.openwpm.getHarForTab(tabId);
        console.log(
          "handleUpdated + 5 seconds - HAR from await browser.openwpm.getHarForTab(tabId)",
          har,
        );
      }, 5000);
    }
  }

  async handleRemoved(tabId, removeInfo) {
    console.log("handleRemoved", tabId, removeInfo);
    console.log("Dumping HAR for tab since the tab has been removed");
    const har = await browser.openwpm.getHarForTab(tabId);
    console.log(
      "handleRemoved - HAR from await browser.openwpm.getHarForTab(tabId)",
      har,
    );
    // The tab object is already destroyed, but we need this for our own monitoring clean-up
    // TODO
    // await browser.openwpm.disableNetworkMonitorForTab(tabId);
  }
}
