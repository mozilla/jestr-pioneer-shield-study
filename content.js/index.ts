import { injectJavascriptInstrumentPageScript } from "openwpm-webext-instrumentation";

// inject page script if not in incognito context
if (!browser.extension.inIncognitoContext) {
  injectJavascriptInstrumentPageScript();
}
