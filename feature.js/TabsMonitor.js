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

  cleanup() {
    browser.tabs.onActivated.removeListener(this.tabActivatedListener);
    browser.tabs.onCreated.removeListener(this.tabCreatedListener);
    browser.tabs.onUpdated.removeListener(this.tabUpdatedListener);
    browser.tabs.onRemoved.removeListener(this.tabRemovedListener);
  }

  async handleActivated(activeInfo) {
    await browser.study.logger.log(["handleActivated", activeInfo]);
    // this.monitoredTabIds
  }

  async handleCreated(tab) {
    await browser.study.logger.log(["handleCreated", tab]);
  }

  async handleUpdated(tabId, changeInfo, tab) {
    await browser.study.logger.log(["handleUpdated", tabId, changeInfo, tab]);
  }

  async handleRemoved(tabId, removeInfo) {
    await browser.study.logger.log(["handleRemoved", tabId, removeInfo]);
  }
}
