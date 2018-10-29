import { telemetrySender } from "./telemetrySender";

export const logInfo = async function(msg) {
  const level = "info";
  const logEntry = { level, msg };
  await browser.study.logger.log(["dataReceiver - INFO: ", logEntry]);
  await telemetrySender.submitTelemetryPayload("openwpmLog", logEntry);
};

export const logDebug = async function(msg) {
  const level = "debug";
  const logEntry = { level, msg };
  await browser.study.logger.debug(["dataReceiver - DEBUG", logEntry]);
  await telemetrySender.submitTelemetryPayload("openwpmLog", logEntry);
};

export const logWarn = async function(msg) {
  const level = "warn";
  const logEntry = { level, msg };
  await browser.study.logger.warn(["dataReceiver - WARN", logEntry]);
  await telemetrySender.submitTelemetryPayload("openwpmLog", logEntry);
};

export const logError = async function(msg) {
  const level = "error";
  const logEntry = { level, msg };
  await browser.study.logger.error(["dataReceiver - ERROR", logEntry]);
  await telemetrySender.submitTelemetryPayload("openwpmLog", logEntry);
};

export const logCritical = async function(msg) {
  const level = "error";
  const logEntry = { level, msg };
  await browser.study.logger.error(["dataReceiver - CRITICAL", logEntry]);
  await telemetrySender.submitTelemetryPayload("openwpmLog", logEntry);
};

export const saveRecord = async function(instrument, record) {
  await browser.study.logger.log([
    "dataReceiver - saveRecord - instrument",
    instrument,
    // record, // Too large to send to console
  ]);
  await telemetrySender.submitTelemetryPayload(instrument, record);
};

export const saveContent = async function(content, contentHash) {
  await browser.study.logger.log([
    "dataReceiver - saveContent - contentHash, content.length",
    contentHash,
    content.length,
  ]);
  await telemetrySender.submitTelemetryPayload("savedContent", {
    content,
    contentHash,
  });
};
