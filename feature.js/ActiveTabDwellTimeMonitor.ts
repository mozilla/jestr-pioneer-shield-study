/**
 * Monitors active dwell time of all opened/activated tabs
 */
export class ActiveTabDwellTimeMonitor {
  public run() {
    // checks what is the current tabId every interval and attributes the interval length of dwell time to that tab
    const intervalMs = 250;
    console.log("intervalMs", intervalMs);
  }

  public getActiveDwellTimeForTab(tabId) {
    console.log("TODO: getDwellTimeForTab", tabId);
  }
}
