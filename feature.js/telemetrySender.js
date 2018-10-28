export class TelemetrySender {
  async submitTelemetryPayload(interfaceName, payload) {
    const stringStringMap = this.createShieldPingPayload(payload);
    return this.sendTelemetry(stringStringMap);
  }

  // TODO: @glind: move to shield study utils?
  createShieldPingPayload(shieldPingAttributes) {
    const shieldPingPayload = {};

    // shield ping attributes must be strings
    for (const attribute in shieldPingAttributes) {
      let attributeValue = shieldPingAttributes[attribute];
      if (typeof attributeValue === "undefined") {
        attributeValue = "null";
      }
      if (typeof attributeValue === "object") {
        attributeValue = JSON.stringify(attributeValue);
      }
      if (typeof attributeValue !== "string") {
        attributeValue = String(attributeValue);
      }
      shieldPingPayload[attribute] = attributeValue;
    }

    return shieldPingPayload;
  }

  async sendTelemetry(stringStringMap) {
    return browser.study.sendTelemetry(stringStringMap);
  }
}

// export a singleton
export const telemetrySender = new TelemetrySender();
