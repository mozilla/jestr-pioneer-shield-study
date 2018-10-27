import { storeInDb } from "./db";

// send to console if debugging
const debugging = true;

export const logInfo = async function(msg) {
  const level = "info";
  const logEntry = { level, msg };
  if (debugging) {
    console.log(logEntry);
  }
  await storeInDb("openwpmLog", logEntry);
};

export const logDebug = async function(msg) {
  const level = "debug";
  const logEntry = { level, msg };
  if (debugging) {
    console.log(logEntry);
  }
  await storeInDb("openwpmLog", logEntry);
};

export const logWarn = async function(msg) {
  const level = "warn";
  const logEntry = { level, msg };
  if (debugging) {
    console.warn(logEntry);
  }
  await storeInDb("openwpmLog", logEntry);
};

export const logError = async function(msg) {
  const level = "error";
  const logEntry = { level, msg };
  if (debugging) {
    console.error(logEntry);
  }
  await storeInDb("openwpmLog", logEntry);
};

export const logCritical = async function(msg) {
  const level = "error";
  const logEntry = { level, msg };
  if (debugging) {
    console.error(logEntry);
  }
  await storeInDb("openwpmLog", logEntry);
};

export const saveRecord = async function(instrument, record) {
  if (debugging) {
    console.log(
      "OpenWPM dataReceiver saveRecord",
      instrument,
      JSON.stringify(record),
    );
    return;
  }
  await storeInDb(instrument, record);
};

export const saveContent = async function(content, contentHash) {
  if (debugging) {
    console.log(
      "OpenWPM dataReceiver saveRecord - contentHash, content.length:",
      contentHash,
      content.length,
    );
    return;
  }
  await storeInDb("savedContent", { content, contentHash });
};
