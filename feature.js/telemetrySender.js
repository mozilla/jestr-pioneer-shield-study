import { humanFileSize } from "./humanFileSize";

export class TelemetrySender {
  async submitTelemetryPayload(type, payload) {
    const studyTelemetryPacket = {
      type,
      payload,
    };
    const stringStringMap = this.createShieldPingPayload(studyTelemetryPacket);
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
    const calculatedPingSize = await browser.study.calculateTelemetryPingSize(
      stringStringMap,
    );
    await browser.study.logger.info(
      `Calculated size of ping which is being submitted: ${humanFileSize(
        calculatedPingSize,
      )}`,
    );
    return browser.study.sendTelemetry(stringStringMap);
  }
}

// export a singleton
export const telemetrySender = new TelemetrySender();
