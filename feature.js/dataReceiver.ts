import { telemetrySender } from "./telemetrySender";
import { humanFileSize } from "./humanFileSize";

declare namespace browser.study {
  const logger: any;
}

export interface LogEntry {
  level: string;
  msg: string;
}

export interface CapturedContent {
  content: string;
  contentHash: string;
}

export const logDebug = async function(msg) {
  await browser.study.logger.debug(`OpenWPM DEBUG log message: ${msg}`);
};

export const logInfo = async function(msg) {
  const level = "info";
  const logEntry: LogEntry = { level, msg };
  await browser.study.logger.log(`OpenWPM INFO log message: ${msg}`);
  await telemetrySender.submitTelemetryPayload("openwpm_log", logEntry);
};

export const logWarn = async function(msg) {
  const level = "warn";
  const logEntry: LogEntry = { level, msg };
  await browser.study.logger.warn(`OpenWPM WARN log message: ${msg}`);
  await telemetrySender.submitTelemetryPayload("openwpm_log", logEntry);
};

export const logError = async function(msg) {
  const level = "error";
  const logEntry: LogEntry = { level, msg };
  await browser.study.logger.error(`OpenWPM ERROR log message: ${msg}`);
  await telemetrySender.submitTelemetryPayload("openwpm_log", logEntry);
};

export const logCritical = async function(msg) {
  const level = "critical";
  const logEntry: LogEntry = { level, msg };
  await browser.study.logger.error(`OpenWPM CRITICAL log message: ${msg}`);
  await telemetrySender.submitTelemetryPayload("openwpm_log", logEntry);
};

export const saveRecord = async function(instrument, record) {
  await browser.study.logger.log(
    `OpenWPM ${instrument} instrumentation package received`,
  );
  await telemetrySender.submitTelemetryPayload(instrument, record);
};

export const saveContent = async function(content, contentHash) {
  await browser.study.logger.log(
    `OpenWPM saveContent packet of approximate size ${humanFileSize(
      content.length,
    )} received. Hash: ${contentHash}`,
  );
  const capturedContent: CapturedContent = {
    content,
    contentHash,
  };
  await telemetrySender.submitTelemetryPayload(
    "openwpm_captured_content",
    capturedContent,
  );
};
