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
  TrimmedNavigationBatch,
} from "./StudyPayloadPreprocessor";
import { escapeString } from "openwpm-webext-instrumentation";

export const thresholdSize = 1024 * 500;

/**
 * Shield utils schema requires all study telemetry packet
 * attributes to be strings
 */
export interface StringifiedStudyTelemetryPacket {
  type: string;
  navigation?: string;
  navigationBatch?: string;
  trimmedNavigationBatch?: string;
  httpRequest?: string;
  httpResponse?: string;
  httpRedirect?: string;
  javascriptOperation?: string;
  javascriptCookieRecord?: string;
  logEntry?: string;
  capturedContent?: string;
  calculatedPingSize: string;
  originalCalculatedPingSize: string;
  originalCalculatedPingSizeOverThreshold: string;
  tabActiveDwellTime?: string;
}

export class TelemetrySender {
  private studyPayloadPreprocessor: StudyPayloadPreprocessor;
  constructor(studyPayloadPreprocessor: StudyPayloadPreprocessor) {
    studyPayloadPreprocessor.setTelemetrySender(this);
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
      return;
    }

    return this.sendStudyPayloadEnvelope(studyPayloadEnvelope);
  }

  public async sendStudyPayloadEnvelope(
    studyPayloadEnvelope: StudyPayloadEnvelope,
  ) {
    const sizedAndPrepared = await this.prepareForTelemetry(
      studyPayloadEnvelope,
    );
    const acceptablySizedReadyForSending = await this.ensurePingSizeUnderThreshold(
      sizedAndPrepared,
      studyPayloadEnvelope,
    );
    return this.sendTelemetry(acceptablySizedReadyForSending);
  }

  private async prepareForTelemetry(
    studyPayloadEnvelope: StudyPayloadEnvelope,
    originalCalculatedPingSize: number = null,
  ) {
    const studyTelemetryPacket: StudyTelemetryPacket = {
      ...studyPayloadEnvelope,
      calculatedPingSize: "0000000000", // Will be replaced below with the real (approximate) calculated ping size
      originalCalculatedPingSize: "0000000000", // Will be replaced below with the real (approximate) calculated ping size
      originalCalculatedPingSizeOverThreshold: 0,
    };
    const sizedAndPrepared: StringifiedStudyTelemetryPacket = this.stringifyPayload(
      studyTelemetryPacket,
    );
    const calculatedPingSize = await browser.study.calculateTelemetryPingSize(
      sizedAndPrepared,
    );
    sizedAndPrepared.calculatedPingSize = String(calculatedPingSize);
    sizedAndPrepared.originalCalculatedPingSize = String(
      originalCalculatedPingSize
        ? originalCalculatedPingSize
        : calculatedPingSize,
    );
    return sizedAndPrepared;
  }

  /**
   * Since shield utils schema requires all study telemetry packet
   * attributes to be strings
   */
  private stringifyPayload(
    studyTelemetryPacket: StudyTelemetryPacket,
  ): StringifiedStudyTelemetryPacket {
    const stringifiedStudyTelemetryPacket: StringifiedStudyTelemetryPacket = {
      type: escapeString(studyTelemetryPacket.type),
      calculatedPingSize: JSON.stringify(
        studyTelemetryPacket.calculatedPingSize,
      ),
      originalCalculatedPingSize: JSON.stringify(
        studyTelemetryPacket.originalCalculatedPingSize,
      ),
      originalCalculatedPingSizeOverThreshold: JSON.stringify(
        studyTelemetryPacket.originalCalculatedPingSizeOverThreshold,
      ),
    };
    [
      "navigation",
      "navigationBatch",
      "trimmedNavigationBatch",
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

  /**
   * Do not let large packets through
   * @param sizedAndPrepared
   * @param studyPayloadEnvelope
   */
  private async ensurePingSizeUnderThreshold(
    sizedAndPrepared: StringifiedStudyTelemetryPacket,
    studyPayloadEnvelope: StudyPayloadEnvelope,
  ) {
    const calculatedPingSize = parseInt(
      sizedAndPrepared.calculatedPingSize,
      10,
    );
    const originalCalculatedPingSize = parseInt(
      sizedAndPrepared.originalCalculatedPingSize,
      10,
    );
    const logMessage = `Calculated size of the ${
      sizedAndPrepared.type
    } ping which is being submitted: ${humanFileSize(
      calculatedPingSize,
    )} - original pings size ${humanFileSize(originalCalculatedPingSize)}`;
    if (calculatedPingSize > thresholdSize) {
      await browser.study.logger.log(logMessage);

      if (studyPayloadEnvelope.type === "navigation_batches") {
        sizedAndPrepared = await this.trimNavigationBatch(
          sizedAndPrepared,
          studyPayloadEnvelope,
        );
      } else {
        this.dropOpenWpmPayloadAndSendStudyPayloadEnvelope(sizedAndPrepared);
      }

      const calculatedPingSize = await browser.study.calculateTelemetryPingSize(
        sizedAndPrepared,
      );
      sizedAndPrepared.calculatedPingSize = String(calculatedPingSize);

      await browser.study.logger.log(
        `Original calculated ping size over 500kb (${humanFileSize(
          originalCalculatedPingSize,
        )}) - OpenWPM payload of type ${
          sizedAndPrepared.type
        } dropped - new pings size ${humanFileSize(calculatedPingSize)}`,
      );
    } else {
      await browser.study.logger.info(logMessage);
    }
    if (originalCalculatedPingSize > thresholdSize) {
      sizedAndPrepared.originalCalculatedPingSizeOverThreshold = "1";
    } else {
      sizedAndPrepared.originalCalculatedPingSizeOverThreshold = "0";
    }
    return sizedAndPrepared;
  }

  private async trimNavigationBatch(
    sizedAndPrepared: StringifiedStudyTelemetryPacket,
    studyPayloadEnvelope: StudyPayloadEnvelope,
  ) {
    console.log(
      "studyPayloadEnvelope, sizedAndPrepared",
      studyPayloadEnvelope,
      sizedAndPrepared,
    );
    const originalCalculatedPingSize = parseInt(
      sizedAndPrepared.originalCalculatedPingSize,
      10,
    );
    const trimmedNavigationBatch: TrimmedNavigationBatch = {
      ...studyPayloadEnvelope.navigationBatch,
      trimmedHttpRequestCount: -1,
      trimmedHttpResponseCount: -1,
      trimmedHttpRedirectCount: -1,
      trimmedJavascriptOperationCount: -1,
    };

    const maxIterations = 1000;

    /*
    originalCalculatedPingSize = await browser.study.calculateTelemetryPingSize(
      sizedAndPrepared,
    );
    await this.ensurePingSizeUnderThreshold(studyPayloadEnvelope);
    */

    const childEnvelopes = trimmedNavigationBatch.childEnvelopes;
    trimmedNavigationBatch.childEnvelopes = [];

    let i,
      currentCalculatedSize,
      trimmedSizedAndPrepared: StringifiedStudyTelemetryPacket,
      trimmedStudyPayloadEnvelope: StudyPayloadEnvelope;

    // initial values
    i = 0;
    do {
      i = i + 1;

      console.log("TODO TRIM iteration", i);

      // try adding one packet at a time
      trimmedNavigationBatch.childEnvelopes = childEnvelopes.splice(0, i);

      // console.log("TODO TRIM trimmedNavigationBatch", trimmedNavigationBatch);

      trimmedStudyPayloadEnvelope = {
        type: "trimmed_navigation_batches",
        trimmedNavigationBatch,
      };

      const trimmedSizedAndPreparedCandidate = await this.prepareForTelemetry(
        trimmedStudyPayloadEnvelope,
        originalCalculatedPingSize,
      );

      currentCalculatedSize = parseInt(
        trimmedSizedAndPreparedCandidate.calculatedPingSize,
        10,
      );

      console.log("TODO TRIM currentCalculatedSize", currentCalculatedSize);

      // we stop being happy when we are at 1kb under the hard threshold
      // (1kb allows for some fuzzyness in how the sizes may
      // differ slightly after smaller modifications)
      if (currentCalculatedSize > thresholdSize - 1024) {
        break;
      }

      trimmedSizedAndPrepared = trimmedSizedAndPreparedCandidate;
    } while (i < maxIterations);

    // as a final safe-guard, run it through the filter against
    return await this.ensurePingSizeUnderThreshold(
      trimmedSizedAndPrepared,
      trimmedStudyPayloadEnvelope,
    );
  }

  private async dropOpenWpmPayloadAndSendStudyPayloadEnvelope(
    sizedAndPrepared: StringifiedStudyTelemetryPacket,
  ) {
    delete sizedAndPrepared.navigation;
    delete sizedAndPrepared.navigationBatch;
    delete sizedAndPrepared.trimmedNavigationBatch;
    delete sizedAndPrepared.httpRequest;
    delete sizedAndPrepared.httpResponse;
    delete sizedAndPrepared.httpRedirect;
    delete sizedAndPrepared.javascriptOperation;
    delete sizedAndPrepared.javascriptCookieRecord;
    delete sizedAndPrepared.logEntry;
    delete sizedAndPrepared.capturedContent;
  }

  private async sendTelemetry(
    acceptablySizedReadyForSending: StringifiedStudyTelemetryPacket,
  ) {
    console.log(
      "acceptablySizedReadyForSending",
      acceptablySizedReadyForSending,
    );
    return browser.study.sendTelemetry(acceptablySizedReadyForSending);
  }
}
