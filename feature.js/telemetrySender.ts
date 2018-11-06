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
  Navigation,
  HttpRequest,
  HttpResponse,
  HttpRedirect,
  JavascriptOperation,
  JavascriptCookieRecord,
} from "openwpm-webext-instrumentation";
import { CapturedContent, LogEntry } from "./dataReceiver";

type OpenWPMType =
  | "navigations"
  | "http_requests"
  | "http_responses"
  | "http_redirects"
  | "javascript"
  | "javascript_cookies"
  | "openwpm_log"
  | "openwpm_captured_content";
type OpenWPMPayload =
  | Navigation
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation
  | JavascriptCookieRecord
  | LogEntry
  | CapturedContent;

interface StudyTelemetryPacket {
  type: OpenWPMType;
  payload: OpenWPMPayload;
  calculatedPingSize: string;
  calculatedPingSizeOverThreshold: number;
  tabActiveDwellTime?: number;
}

interface StringifiedStudyTelemetryPacket {
  type?: string;
  payload?: string;
  calculatedPingSize?: string;
  calculatedPingSizeOverThreshold?: string;
  tabActiveDwellTime?: string;
}

export class TelemetrySender {
  async submitOpenWPMPacketToTelemetry(type, payload, tabActiveDwellTime: number = null) {
    if (await browser.privacyContext.aPrivateBrowserWindowIsOpen()) {
      // drop the ping - do not send any telemetry
      return;
    }
    const studyTelemetryPacket: StudyTelemetryPacket = {
      type,
      payload,
      calculatedPingSize: "0000000000", // Will be replaced below with the real (approximate) calculated ping size
      calculatedPingSizeOverThreshold: 0,
      tabActiveDwellTime: tabActiveDwellTime,
    };
    const stringStringMap: StringifiedStudyTelemetryPacket = this.stringifyPayload(
      studyTelemetryPacket,
    );
    return this.sendTelemetry(stringStringMap);
  }

  stringifyPayload(
    studyTelemetryPacket: StudyTelemetryPacket,
  ): StringifiedStudyTelemetryPacket {
    return {
      type: JSON.stringify(studyTelemetryPacket.type),
      payload: JSON.stringify(studyTelemetryPacket.payload),
      calculatedPingSize: JSON.stringify(
        studyTelemetryPacket.calculatedPingSize,
      ),
      calculatedPingSizeOverThreshold: JSON.stringify(
        studyTelemetryPacket.calculatedPingSizeOverThreshold,
      ),
      tabActiveDwellTime: JSON.stringify(studyTelemetryPacket.tabActiveDwellTime),
    };
  }

  async sendTelemetry(stringStringMap: StringifiedStudyTelemetryPacket) {
    const calculatedPingSize = await browser.study.calculateTelemetryPingSize(
      stringStringMap,
    );
    stringStringMap.calculatedPingSize = String(calculatedPingSize);
    const logMessage = `Calculated size of the ${
      stringStringMap.type
    } ping which is being submitted: ${humanFileSize(calculatedPingSize)}`;
    if (calculatedPingSize > 1024 * 500) {
      await browser.study.logger.log(logMessage);
      delete stringStringMap.payload;
      stringStringMap.calculatedPingSizeOverThreshold = "1";
      await browser.study.logger.log(
        "Calculated ping size over 500kb - OpenWPM payload dropped",
      );
    } else {
      await browser.study.logger.info(logMessage);
    }
    return browser.study.sendTelemetry(stringStringMap);
  }
}

// export a singleton
export const telemetrySender = new TelemetrySender();
