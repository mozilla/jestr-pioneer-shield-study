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
  StudyPayloadPreprocessor,
  StudyTelemetryPacket,
} from "./studyPayloadPreprocessor";

/**
 * Shield utils schema requires all study telemetry packet
 * attributes to be strings
 */
export interface StringifiedStudyTelemetryPacket {
  type?: string;
  navigation?: string;
  navigationBatch?: string;
  httpRequest?: string;
  httpResponse?: string;
  httpRedirect?: string;
  javascriptOperation?: string;
  javascriptCookieRecord?: string;
  logEntry?: string;
  capturedContent?: string;
  calculatedPingSize?: string;
  calculatedPingSizeOverThreshold?: string;
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
      type,
      navigation: type === "navigations" ? payload : undefined,
      navigationBatch: type === "navigation_batches" ? payload : undefined,
      httpRequest: type === "http_requests" ? payload : undefined,
      httpResponse: type === "http_responses" ? payload : undefined,
      httpRedirect: type === "http_redirects" ? payload : undefined,
      javascriptOperation: type === "javascript" ? payload : undefined,
      javascriptCookieRecord:
        type === "javascript_cookies" ? payload : undefined,
      logEntry: type === "openwpm_log" ? payload : undefined,
      capturedContent:
        type === "openwpm_captured_content" ? payload : undefined,
      tabActiveDwellTime,
    };

    // Any http or javascript packet with tabId is sent for batching by corresponding navigation
    // or dropped (if no corresponding navigation showed up)
    if (
      [
        "navigations",
        "http_requests",
        "http_responses",
        "http_redirects",
        "javascript",
      ].includes(type) &&
      payload.extension_session_uuid &&
      payload.window_id > -1 &&
      payload.tab_id > -1 &&
      payload.frame_id > -1
    ) {
      this.studyPayloadPreprocessor.addToQueue(studyPayloadEnvelope);
      return;
    }

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

  stringifyPayload(
    studyTelemetryPacket: StudyTelemetryPacket,
  ): StringifiedStudyTelemetryPacket {
    return {
      type: JSON.stringify(studyTelemetryPacket.type),
      navigation: JSON.stringify(studyTelemetryPacket.navigation),
      navigationBatch: JSON.stringify(studyTelemetryPacket.navigationBatch),
      httpRequest: JSON.stringify(studyTelemetryPacket.httpRequest),
      httpResponse: JSON.stringify(studyTelemetryPacket.httpResponse),
      httpRedirect: JSON.stringify(studyTelemetryPacket.httpRedirect),
      javascriptOperation: JSON.stringify(
        studyTelemetryPacket.javascriptOperation,
      ),
      javascriptCookieRecord: JSON.stringify(
        studyTelemetryPacket.javascriptCookieRecord,
      ),
      logEntry: JSON.stringify(studyTelemetryPacket.logEntry),
      capturedContent: JSON.stringify(studyTelemetryPacket.capturedContent),
      tabActiveDwellTime: JSON.stringify(
        studyTelemetryPacket.tabActiveDwellTime,
      ),
      calculatedPingSize: JSON.stringify(
        studyTelemetryPacket.calculatedPingSize,
      ),
      calculatedPingSizeOverThreshold: JSON.stringify(
        studyTelemetryPacket.calculatedPingSizeOverThreshold,
      ),
    };
  }

  async ensurePingSizeUnderThreshold(
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

  async sendTelemetry(
    acceptableStringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket,
  ) {
    return browser.study.sendTelemetry(
      acceptableStringifiedStudyTelemetryPacket,
    );
  }
}
