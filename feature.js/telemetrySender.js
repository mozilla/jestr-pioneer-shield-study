export class TelemetrySender {
  async submitTelemetryPayload(interfaceName, payload) {
    const stringStringMap = { ...payload };
    return this.sendTelemetry(stringStringMap);
  }

  async sendTelemetry(stringStringMap) {
    return browser.study.sendTelemetry(stringStringMap);
  }
}

// export a singleton
export const telemetrySender = new TelemetrySender();
