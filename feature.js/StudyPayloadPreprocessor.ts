import {
  HttpRedirect,
  HttpRequest,
  HttpResponse,
  JavascriptCookieRecord,
  JavascriptOperation,
  Navigation,
  dateTimeUnicodeFormatString,
} from "openwpm-webext-instrumentation";
import { CapturedContent, LogEntry } from "./dataReceiver";
import { parse } from "date-fns";

declare namespace browser.alarms {
  function create(
    name: string,
    alarmInfo: {
      /** Time when the alarm is scheduled to first fire, in milliseconds past the epoch. */
      when?: number;
      /** Number of minutes from the current time after which the alarm should first fire. */
      delayInMinutes?: number;
      /** Number of minutes after which the alarm should recur repeatedly. */
      periodInMinutes?: number;
    },
  ): void;
  function clear(name: string): boolean;
}

declare namespace browser.alarms.onAlarm {
  function addListener(listener: any);
  function removeListener(listener: any);
}

declare namespace browser.runtime {
  const id: any;
}

declare namespace browser.privacyContext {
  function aPrivateBrowserWindowIsOpen(): boolean;
}

export interface NavigationBatch {
  navigation: Navigation;
  httpRequests: HttpRequest[];
  httpResponses: HttpResponse[];
  httpRedirects: HttpRedirect[];
  javascriptOperations: JavascriptOperation[];
  originalHttpRequestCount: number;
  originalHttpResponseCount: number;
  originalHttpRedirectCount: number;
  originalJavascriptOperationCount: number;
}

export type OpenWPMType =
  | "navigations"
  | "navigation_batches"
  | "http_requests"
  | "http_responses"
  | "http_redirects"
  | "javascript"
  | "javascript_cookies"
  | "openwpm_log"
  | "openwpm_captured_content";

/**
 * The basic packet structure and target for study analysis
 */
export interface StudyPayloadEnvelope {
  type: OpenWPMType;
  navigation?: Navigation;
  navigationBatch?: NavigationBatch;
  httpRequest?: HttpRequest;
  httpResponse?: HttpResponse;
  httpRedirect?: HttpRedirect;
  javascriptOperation?: JavascriptOperation;
  javascriptCookieRecord?: JavascriptCookieRecord;
  logEntry?: LogEntry;
  capturedContent?: CapturedContent;
  tabActiveDwellTime?: number;
}

/**
 * Additional fiels are relevant at the study telemetry packet level
 * since we drop the `payload` attribute if the calculatedPingSize
 * exceeds a certain threshold
 */
export interface StudyTelemetryPacket extends StudyPayloadEnvelope {
  calculatedPingSize: string;
  calculatedPingSizeOverThreshold: number;
}

export class StudyPayloadPreprocessor {
  public studyPayloadEnvelopeQueue: StudyPayloadEnvelope[] = [];
  public addToQueue(studyPayloadEnvelope: StudyPayloadEnvelope) {
    this.studyPayloadEnvelopeQueue.push(studyPayloadEnvelope);
  }
  private alarmName: string;

  public async run() {
    this.alarmName = `${browser.runtime.id}:queueProcessorAlarm`;
    const alarmListener = async _alarm => {
      if (await browser.privacyContext.aPrivateBrowserWindowIsOpen()) {
        // do not process the batch queue right now (will attempt again at next alarm interval)
        return;
      }
      this.processQueue();
    };
    browser.alarms.onAlarm.addListener(alarmListener);
    browser.alarms.create(this.alarmName, {
      periodInMinutes: 10 / 60, // every 10 seconds
    });
  }

  public async cleanup() {
    if (this.alarmName) {
      await browser.alarms.clear(this.alarmName);
    }
  }

  /**
   * Removes study payload envelopes from the queue, grouped by their presumed
   * originating web navigations
   * @param nowDateTime
   */
  public async processQueue(nowDateTime: Date = new Date()) {
    const webNavigationStudyPayloadEnvelopes = this.studyPayloadEnvelopeQueue.filter(
      (studyPayloadEnvelope: StudyPayloadEnvelope) => {
        return studyPayloadEnvelope.type === "navigations";
      },
    );

    const webNavigationStudyPayloadEnvelopesToSubmit = webNavigationStudyPayloadEnvelopes.filter(
      (studyPayloadEnvelope: StudyPayloadEnvelope) => {
        const navigation = studyPayloadEnvelope.navigation;
        const committedDateTime = parse(
          navigation.committed_time_stamp,
          dateTimeUnicodeFormatString,
          new Date(),
        );
        console.log(
          "committedDateTime",
          committedDateTime,
        );
        return true;
      },
    );

    console.log(
      "TODO processQueue",
      this.studyPayloadEnvelopeQueue.length,
      webNavigationStudyPayloadEnvelopes.length,
      // this.studyPayloadEnvelopeQueue,
      // webNavigationStudyPayloadEnvelopesToSubmit,
      // JSON.stringify(this.studyPayloadEnvelopeQueue),
    );

  }
}
