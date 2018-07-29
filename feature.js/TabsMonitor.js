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
    await browser.openwpm.enableNetworkMonitorForTab(tab.id);
  }

  async handleUpdated(tabId, changeInfo, tab) {
    console.log("handleUpdated", tabId, changeInfo, tab);
    const har = await browser.openwpm.getHarForTab(tabId);
    console.log(
      "handleUpdated - HAR from await browser.openwpm.getHarForTab(tabId)",
      har,
    );
  }

  async handleRemoved(tabId, removeInfo) {
    console.log("handleRemoved", tabId, removeInfo);
    const har = await browser.openwpm.getHarForTab(tabId);
    console.log(
      "handleRemoved - HAR from await browser.openwpm.getHarForTab(tabId)",
      har,
    );
  }
}
