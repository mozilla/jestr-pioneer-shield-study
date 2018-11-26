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
  navigationEnvelope: StudyPayloadEnvelope;
  httpRequestEnvelopes: StudyPayloadEnvelope[];
  httpResponseEnvelopes: StudyPayloadEnvelope[];
  httpRedirectEnvelopes: StudyPayloadEnvelope[];
  javascriptOperationEnvelopes: StudyPayloadEnvelope[];
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

type OpenWPMPayload =
  | Navigation
  | NavigationBatch
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation
  | JavascriptCookieRecord
  | LogEntry
  | CapturedContent;

type BatchableOpenWPMPayload =
  | Navigation
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation;

type BatchableChildOpenWPMPayload =
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation;

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
 * Additional fields are relevant at the study telemetry packet level
 * since we drop the `payload` attribute if the calculatedPingSize
 * exceeds a certain threshold
 */
export interface StudyTelemetryPacket extends StudyPayloadEnvelope {
  calculatedPingSize: string;
  calculatedPingSizeOverThreshold: number;
}

export const batchableOpenWpmPayloadFromStudyPayloadEnvelope = (
  studyPayloadEnvelope: StudyPayloadEnvelope,
): BatchableOpenWPMPayload => {
  switch (studyPayloadEnvelope.type) {
    case "navigations":
      return studyPayloadEnvelope.navigation as Navigation;
    case "http_requests":
      return studyPayloadEnvelope.httpRequest as HttpRequest;
    case "http_responses":
      return studyPayloadEnvelope.httpResponse as HttpResponse;
    case "http_redirects":
      return studyPayloadEnvelope.httpRedirect as HttpRedirect;
    case "javascript":
      return studyPayloadEnvelope.javascriptOperation as JavascriptOperation;
  }
  throw new Error(`Unexpected type supplied: '${studyPayloadEnvelope.type}'`);
};

export const studyPayloadEnvelopeFromOpenWpmTypeAndPayload = (
  type: OpenWPMType,
  payload: OpenWPMPayload,
): StudyPayloadEnvelope => {
  const studyPayloadEnvelope: StudyPayloadEnvelope = {
    type,
    navigation: type === "navigations" ? (payload as Navigation) : undefined,
    navigationBatch:
      type === "navigation_batches" ? (payload as NavigationBatch) : undefined,
    httpRequest:
      type === "http_requests" ? (payload as HttpRequest) : undefined,
    httpResponse:
      type === "http_responses" ? (payload as HttpResponse) : undefined,
    httpRedirect:
      type === "http_redirects" ? (payload as HttpRedirect) : undefined,
    javascriptOperation:
      type === "javascript" ? (payload as JavascriptOperation) : undefined,
    javascriptCookieRecord:
      type === "javascript_cookies"
        ? (payload as JavascriptCookieRecord)
        : undefined,
    logEntry: type === "openwpm_log" ? (payload as LogEntry) : undefined,
    capturedContent:
      type === "openwpm_captured_content"
        ? (payload as CapturedContent)
        : undefined,
  };
  return studyPayloadEnvelope;
};

export class StudyPayloadPreprocessor {
  public studyPayloadEnvelopeProcessQueue: StudyPayloadEnvelope[] = [];
  public navigationBatchSendQueue: NavigationBatch[] = [];
  public queueForProcessing(studyPayloadEnvelope: StudyPayloadEnvelope) {
    this.studyPayloadEnvelopeProcessQueue.push(studyPayloadEnvelope);
  }
  public shouldBeBatched(studyPayloadEnvelope: StudyPayloadEnvelope) {
    return (
      this.batchableOpenWpmType(studyPayloadEnvelope.type) &&
      this.canBeMatchedToWebNavigationFrame(
        batchableOpenWpmPayloadFromStudyPayloadEnvelope(studyPayloadEnvelope),
      )
    );
  }
  private batchableOpenWpmType(type: OpenWPMType) {
    return [
      "navigations",
      "http_requests",
      "http_responses",
      "http_redirects",
      "javascript",
    ].includes(type);
  }
  private canBeMatchedToWebNavigationFrame(payload: BatchableOpenWPMPayload) {
    return (
      payload.extension_session_uuid &&
      payload.window_id > -1 &&
      payload.tab_id > -1 &&
      payload.frame_id > -1
    );
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
    const navigationAgeThresholdInSeconds: number = 10;
    const orphanAgeThresholdInSeconds: number = 30;

    // Flush current queue for processing (we will later put back
    // elements that should be processed in an upcoming iteration)
    const { studyPayloadEnvelopeProcessQueue } = this;
    this.studyPayloadEnvelopeProcessQueue = [];

    // Navigations ...
    const webNavigationStudyPayloadEnvelopes = studyPayloadEnvelopeProcessQueue.filter(
      (studyPayloadEnvelope: StudyPayloadEnvelope) => {
        return studyPayloadEnvelope.type === "navigations";
      },
    );

    // ... that are more than navigationAgeThresholdInSeconds seconds old
    const webNavigationStudyPayloadEnvelopesToSend = webNavigationStudyPayloadEnvelopes.filter(
      (studyPayloadEnvelope: StudyPayloadEnvelope) => {
        const navigation = studyPayloadEnvelope.navigation;
        const committedDateTime = parse(
          navigation.committed_time_stamp,
          dateTimeUnicodeFormatString,
          new Date(),
        );
        const seconds = nowDateTime.getTime() - committedDateTime.getTime();
        return seconds > navigationAgeThresholdInSeconds * 1000;
      },
    );

    const removeItemFromArray = (ar, el) => {
      ar.splice(ar.indexOf(el), 1);
    };

    const sameFrame = (
      subject:
        | Navigation
        | HttpRequest
        | HttpResponse
        | HttpRedirect
        | JavascriptOperation,
      navigation: Navigation,
    ) => {
      return (
        subject.extension_session_uuid === navigation.extension_session_uuid &&
        subject.window_id === navigation.window_id &&
        subject.tab_id === navigation.tab_id &&
        subject.frame_id === navigation.frame_id
      );
    };

    const withinNavigationEventOrdinalBounds = (
      eventOrdinal: number,
      fromEventOrdinal: number,
      toEventOrdinal: number,
    ) => {
      return fromEventOrdinal < eventOrdinal && eventOrdinal < toEventOrdinal;
    };

    // console.log("debug processQueue", studyPayloadEnvelopeProcessQueue.length, webNavigationStudyPayloadEnvelopes.length, webNavigationStudyPayloadEnvelopesToSend.length, // JSON.stringify(studyPayloadEnvelopeProcessQueue),);

    // For each such navigation...
    webNavigationStudyPayloadEnvelopesToSend.map(
      (webNavigationStudyPayloadEnvelope: StudyPayloadEnvelope) => {
        const navigationBatch: NavigationBatch = {
          navigationEnvelope: webNavigationStudyPayloadEnvelope,
          httpRequestEnvelopes: [],
          httpResponseEnvelopes: [],
          httpRedirectEnvelopes: [],
          javascriptOperationEnvelopes: [],
        };

        // Remove the navigation envelope from the queue
        webNavigationStudyPayloadEnvelopesToSend.map(studyPayloadEnvelope => {
          removeItemFromArray(
            studyPayloadEnvelopeProcessQueue,
            studyPayloadEnvelope,
          );
        });

        // Find potential subsequent same-frame navigations
        const subsequentNavigationsMatchingThisNavigationsFrame = studyPayloadEnvelopeProcessQueue.filter(
          (studyPayloadEnvelope: StudyPayloadEnvelope) => {
            switch (studyPayloadEnvelope.type) {
              case "navigations":
                return (
                  sameFrame(
                    studyPayloadEnvelope.navigation,
                    webNavigationStudyPayloadEnvelope.navigation,
                  ) &&
                  withinNavigationEventOrdinalBounds(
                    studyPayloadEnvelope.navigation
                      .before_navigate_event_ordinal,
                    webNavigationStudyPayloadEnvelope.navigation
                      .before_navigate_event_ordinal,
                    Number.MAX_SAFE_INTEGER,
                  )
                );
            }
            return false;
          },
        );

        // console.log("subsequentNavigationsMatchingThisNavigationsFrame.length", subsequentNavigationsMatchingThisNavigationsFrame.length,);

        // Assign matching children to this navigation
        const fromEventOrdinal =
          webNavigationStudyPayloadEnvelope.navigation
            .before_navigate_event_ordinal;
        const toEventOrdinal =
          subsequentNavigationsMatchingThisNavigationsFrame.length === 0
            ? Number.MAX_SAFE_INTEGER
            : subsequentNavigationsMatchingThisNavigationsFrame[0].navigation
                .before_navigate_event_ordinal;

        // Only non-navigations can be assigned navigation parents
        const childCandidates = studyPayloadEnvelopeProcessQueue.filter(
          (studyPayloadEnvelope: StudyPayloadEnvelope) => {
            return studyPayloadEnvelope.type !== "navigations";
          },
        );

        // console.log("childCandidates.length", childCandidates.length);

        const studyPayloadEnvelopesAssignedToThisNavigation = childCandidates.filter(
          (studyPayloadEnvelope: StudyPayloadEnvelope) => {
            // Which are found in the same frame and navigation event ordinal bounds
            const payload: BatchableChildOpenWPMPayload = batchableOpenWpmPayloadFromStudyPayloadEnvelope(
              studyPayloadEnvelope,
            ) as BatchableChildOpenWPMPayload;
            const type = studyPayloadEnvelope.type;
            const isSameFrame = sameFrame(
              payload,
              webNavigationStudyPayloadEnvelope.navigation,
            );
            const isWithinNavigationEventOrdinalBounds = withinNavigationEventOrdinalBounds(
              payload.event_ordinal,
              fromEventOrdinal,
              toEventOrdinal,
            );
            switch (studyPayloadEnvelope.type) {
              case "http_requests":
                if (isSameFrame && isWithinNavigationEventOrdinalBounds) {
                  navigationBatch.httpRequestEnvelopes.push(
                    studyPayloadEnvelope,
                  );
                  removeItemFromArray(
                    studyPayloadEnvelopeProcessQueue,
                    studyPayloadEnvelope,
                  );
                  return true;
                }
                break;
              case "http_responses":
                if (isSameFrame && isWithinNavigationEventOrdinalBounds) {
                  navigationBatch.httpResponseEnvelopes.push(
                    studyPayloadEnvelope,
                  );
                  removeItemFromArray(
                    studyPayloadEnvelopeProcessQueue,
                    studyPayloadEnvelope,
                  );
                  return true;
                }
                break;
              case "http_redirects":
                if (isSameFrame && isWithinNavigationEventOrdinalBounds) {
                  navigationBatch.httpRedirectEnvelopes.push(
                    studyPayloadEnvelope,
                  );
                  removeItemFromArray(
                    studyPayloadEnvelopeProcessQueue,
                    studyPayloadEnvelope,
                  );
                  return true;
                }
                break;
              case "javascript":
                if (isSameFrame && isWithinNavigationEventOrdinalBounds) {
                  navigationBatch.javascriptOperationEnvelopes.push(
                    studyPayloadEnvelope,
                  );
                  removeItemFromArray(
                    studyPayloadEnvelopeProcessQueue,
                    studyPayloadEnvelope,
                  );
                  return true;
                }
                break;
            }
            return false;
          },
        );

        // console.log("studyPayloadEnvelopesAssignedToThisNavigation.length", studyPayloadEnvelopesAssignedToThisNavigation.length,);

        this.navigationBatchSendQueue.push(navigationBatch);
      },
    );

    // Restore unprocessed items to the queue
    studyPayloadEnvelopeProcessQueue.reverse().map(studyPayloadEnvelope => {
      this.studyPayloadEnvelopeProcessQueue.unshift(studyPayloadEnvelope);
    });
  }
}
