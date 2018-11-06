/**
 * Monitors active dwell time of all opened/activated tabs
 */
export class ActiveTabDwellTimeMonitor {
  private tabActiveDwellTimes = {};
  private interval;

  public run() {
    // checks what is the current tabId every interval and attributes the interval length of dwell time to that tab
    const intervalMs = 250;

    this.interval = setInterval(async () => {
      // const tab = await browser.tabs.getCurrent();
      const activeTabs = await browser.tabs.query({currentWindow: true,active: true});
      activeTabs.map((tab) => {
      if (this.tabActiveDwellTimes[tab.id] === undefined) {
        this.tabActiveDwellTimes[tab.id] = intervalMs;
      } else {
        this.tabActiveDwellTimes[tab.id] += intervalMs;
      }
      });
    }, intervalMs);

  }

  public getTabActiveDwellTime(tabId) {
    console.log("TODO: getDwellTimeForTab", tabId);
    return this.tabActiveDwellTimes[tabId];
  }

  public cleanup() {
    clearInterval(this.interval);
  }
}
