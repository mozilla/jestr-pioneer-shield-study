import { humanFileSize } from "./humanFileSize";

declare namespace browser.study {
  const logger: any;

  function calculateTelemetryPingSize(payload: any);

  function sendTelemetry(payload: any);
}

declare namespace browser.privacyContext {
  function aPrivateBrowserWindowIsOpen(): boolean;
}

import {
  OpenWPMType,
  StudyPayloadEnvelope,
  studyPayloadEnvelopeFromOpenWpmTypeAndPayload,
  StudyPayloadPreprocessor,
  StudyTelemetryPacket,
} from "./StudyPayloadPreprocessor";

/**
 * Shield utils schema requires all study telemetry packet
 * attributes to be strings
 */
export interface StringifiedStudyTelemetryPacket {
  type: string;
  navigation?: string;
  navigationBatch?: string;
  httpRequest?: string;
  httpResponse?: string;
  httpRedirect?: string;
  javascriptOperation?: string;
  javascriptCookieRecord?: string;
  logEntry?: string;
  capturedContent?: string;
  calculatedPingSize: string;
  calculatedPingSizeOverThreshold: string;
  tabActiveDwellTime?: string;
}

export class TelemetrySender {
  private studyPayloadPreprocessor: StudyPayloadPreprocessor;

  constructor(studyPayloadPreprocessor: StudyPayloadPreprocessor) {
    this.studyPayloadPreprocessor = studyPayloadPreprocessor;
  }

  async submitOpenWPMPayload(
    type: OpenWPMType,
    payload: any,
    tabActiveDwellTime: number = null,
  ) {
    if (await browser.privacyContext.aPrivateBrowserWindowIsOpen()) {
      // drop the ping - do not send any telemetry
      return;
    }

    const studyPayloadEnvelope: StudyPayloadEnvelope = {
      ...studyPayloadEnvelopeFromOpenWpmTypeAndPayload(type, payload),
      tabActiveDwellTime,
    };

    return this.queueOrSend(studyPayloadEnvelope);
  }

  private async queueOrSend(studyPayloadEnvelope: StudyPayloadEnvelope) {
    // Any http or javascript packet with tabId is sent for batching by corresponding navigation
    // or dropped (if no corresponding navigation showed up)
    if (this.studyPayloadPreprocessor.shouldBeBatched(studyPayloadEnvelope)) {
      this.studyPayloadPreprocessor.queueForProcessing(studyPayloadEnvelope);
      // TODO: debounce with timeout to send any batched payloads
      return;
    }

    return this.sendStudyPayloadEnvelope(studyPayloadEnvelope);
  }

  private async sendStudyPayloadEnvelope(
    studyPayloadEnvelope: StudyPayloadEnvelope,
  ) {
    const studyTelemetryPacket: StudyTelemetryPacket = {
      ...studyPayloadEnvelope,
      calculatedPingSize: "0000000000", // Will be replaced below with the real (approximate) calculated ping size
      calculatedPingSizeOverThreshold: 0,
    };
    const stringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket = this.stringifyPayload(
      studyTelemetryPacket,
    );
    const acceptableStringifiedStudyTelemetryPacket = await this.ensurePingSizeUnderThreshold(
      stringifiedStudyTelemetryPacket,
    );
    return this.sendTelemetry(acceptableStringifiedStudyTelemetryPacket);
  }

  private stringifyPayload(
    studyTelemetryPacket: StudyTelemetryPacket,
  ): StringifiedStudyTelemetryPacket {
    const stringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket = {
      type: JSON.stringify(studyTelemetryPacket.type),
      calculatedPingSize: JSON.stringify(
        studyTelemetryPacket.calculatedPingSize,
      ),
      calculatedPingSizeOverThreshold: JSON.stringify(
        studyTelemetryPacket.calculatedPingSizeOverThreshold,
      ),
    };
    [
      "navigation",
      "navigationBatch",
      "httpRequest",
      "httpResponse",
      "httpRedirect",
      "javascriptOperation",
      "javascriptCookieRecord",
      "logEntry",
      "capturedContent",
      "tabActiveDwellTime",
    ].map(attributeToStringifyIfExists => {
      if (
        typeof studyTelemetryPacket[attributeToStringifyIfExists] !==
        "undefined"
      ) {
        stringifiedStudyTelemetryPacket[
          attributeToStringifyIfExists
        ] = JSON.stringify(studyTelemetryPacket[attributeToStringifyIfExists]);
      }
    });
    return stringifiedStudyTelemetryPacket;
  }

  private async ensurePingSizeUnderThreshold(
    stringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket,
  ) {
    const calculatedPingSize = await browser.study.calculateTelemetryPingSize(
      stringifiedStudyTelemetryPacket,
    );
    stringifiedStudyTelemetryPacket.calculatedPingSize = String(
      calculatedPingSize,
    );
    const logMessage = `Calculated size of the ${
      stringifiedStudyTelemetryPacket.type
    } ping which is being submitted: ${humanFileSize(calculatedPingSize)}`;
    if (calculatedPingSize > 1024 * 500) {
      await browser.study.logger.log(logMessage);
      delete stringifiedStudyTelemetryPacket.navigation;
      delete stringifiedStudyTelemetryPacket.navigationBatch;
      delete stringifiedStudyTelemetryPacket.httpRequest;
      delete stringifiedStudyTelemetryPacket.httpResponse;
      delete stringifiedStudyTelemetryPacket.httpRedirect;
      delete stringifiedStudyTelemetryPacket.javascriptOperation;
      delete stringifiedStudyTelemetryPacket.javascriptCookieRecord;
      delete stringifiedStudyTelemetryPacket.logEntry;
      delete stringifiedStudyTelemetryPacket.capturedContent;
      stringifiedStudyTelemetryPacket.calculatedPingSizeOverThreshold = "1";
      await browser.study.logger.log(
        "Calculated ping size over 500kb - OpenWPM payload dropped",
      );
    } else {
      await browser.study.logger.info(logMessage);
    }
    return stringifiedStudyTelemetryPacket;
  }

  private async sendTelemetry(
    acceptableStringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket,
  ) {
    return browser.study.sendTelemetry(
      acceptableStringifiedStudyTelemetryPacket,
    );
  }
}
