import { storeInDb } from "./db";

/**
 * Adapted from OpenWPM-adapted/automation/Extension/firefox/lib/javascript-instrument.js
 * @param data
 * @param variation
 * @returns {Promise<void>}
 */
async function processCallsAndValues(data, variation) {
  console.log("processCallsAndValues", data, variation);

  /*
   CREATE TABLE IF NOT EXISTS javascript(
     id INTEGER PRIMARY KEY,
     in_iframe BOOLEAN,
     location TEXT,
     crawl_id INTEGER,
     visit_id INTEGER,
     script_url TEXT,
     script_line TEXT,
     script_col TEXT,
     func_name TEXT,
     script_loc_eval TEXT,
     call_stack TEXT,
     symbol TEXT,
     operation TEXT,
     value TEXT,
     arguments TEXT,
     time_stamp TEXT NOT NULL
   );
   */

  var update = {};

  update["variation"] = variation.name;
  update["script_url"] = data.scriptUrl;
  update["script_line"] = data.scriptLine;
  update["script_col"] = data.scriptCol;
  update["func_name"] = data.funcName;
  update["script_loc_eval"] = data.scriptLocEval;
  update["call_stack"] = data.callStack;
  update["symbol"] = data.symbol;
  update["operation"] = data.operation;
  update["value"] = data.value;
  update["time_stamp"] = data.timeStamp;
  update["in_iframe"] = data.inIframe;
  update["location"] = data.location;

  // Create a json object for function arguments
  // We create an object that maps array positon to argument
  // e.g. someFunc('a',123,'b') --> {0: a, 1: 123, 2: 'b'}
  // to make it easier to query the data, using something like the
  // sqlite3 json1 extension.
  var args = {};
  if (data.operation == "call" && data.args.length > 0) {
    for (var i = 0; i < data.args.length; i++) {
      args[i] = data.args[i];
    }
    update["arguments"] = JSON.stringify(args);
  }

  await storeInDb("dataLeaks", update);
}

export function startStoringJsInstrumentationResultsInDb(variation) {
  browser.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      console.log("Background received message: ", message);
      const data = message.msg;
      if (message.type === "logCall" || message.type === "logValue") {
        await processCallsAndValues(data, variation);
      }
    },
  );
}
