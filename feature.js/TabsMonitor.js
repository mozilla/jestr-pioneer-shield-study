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
  }

  async handleUpdated(tabId, changeInfo, tab) {
    console.log("handleUpdated", tabId, changeInfo, tab);
  }

  async handleRemoved(tabId, removeInfo) {
    console.log("handleRemoved", tabId, removeInfo);
  }
}
