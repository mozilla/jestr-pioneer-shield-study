# Telemetry sent by this add-on

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Contents**

- [Usual Firefox Telemetry is mostly unaffected](#usual-firefox-telemetry-is-mostly-unaffected)
- [Study-specific endings](#study-specific-endings)
- [`shield-study` pings (common to all shield-studies)](#shield-study-pings-common-to-all-shield-studies)
- [`shield-study-addon` pings, specific to THIS study.](#shield-study-addon-pings-specific-to-this-study)
- [Example sequence for a 'voted => not sure' interaction](#example-sequence-for-a-voted--not-sure-interaction)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usual Firefox Telemetry is mostly unaffected

- No change: `main` and other pings are UNAFFECTED by this add-on, except that [shield-studies-addon-utils](https://github.com/mozilla/shield-studies-addon-utils) adds the add-on id as an active experiment in the telemetry environment.
- Respects telemetry preferences. If user has disabled telemetry, no telemetry will be sent.

## Study-specific endings

This study has no surveys and as such has NO SPECIFIC ENDINGS.

## `shield-study` pings (common to all shield-studies)

[shield-studies-addon-utils](https://github.com/mozilla/shield-studies-addon-utils) sends the usual packets.

## `shield-study-addon` pings, specific to THIS study.

No user interaction is instrumented in this study.

The add-on listens to navigation, web requests, cookie modifications and access to certain javascript API:s, as determined by [openwpm-webext-instrumentation](https://github.com/mozilla/openwpm-webext-instrumentation/tree/enhancements-batch-2) ([PR](https://github.com/mozilla/openwpm-webext-instrumentation/pull/31)), using the following configuration:

```
  navigation_instrument: true,
  cookie_instrument: true,
  js_instrument: true,
  http_instrument: true,
  save_javascript: false,
  save_all_content: false,
  strip_data_url_data: true,
```

The packets received from the instrumentation are in turn encapsulated in objects of type [`StudyTelemetryPacket`](../feature.js/StudyPayloadPreprocessor.ts), stringified as [`StringifiedStudyTelemetryPacket`](https://github.com/motin/jestr-pioneer-shield-study/blob/master/feature.js/TelemetrySender.ts#L31) and then sent as encrypted telemetry packages using the `shield-study-addon` telemetry envelope defined by [shield-studies-addon-utils](https://github.com/mozilla/shield-studies-addon-utils) 5.2.0 ([PR](https://github.com/mozilla/shield-studies-addon-utils/pull/263)).

Currently, the best way to introspect the internals of `StudyTelemetryPacket` is to follow the Typescript definitions in [StudyPayloadPreprocessor.ts](https://github.com/motin/jestr-pioneer-shield-study/blob/master/feature.js/StudyPayloadPreprocessor.ts).

## Performance optimizations affecting submitted telemetry

- Most OpenWPM events are grouped into batches under their corresponding [web navigations](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation) (https://github.com/motin/jestr-pioneer-shield-study/issues/10), diminishing performance penalties associated with submitting many small packages via Pioneer telemetry.
- A [500kb ping size limit](https://github.com/motin/jestr-pioneer-shield-study/issues/1) applies to the sum of all http and js packets in a particular web navigation, decreasing the overall ping data volume [while still retaining as much relevant data as possible](https://github.com/motin/jestr-pioneer-shield-study/issues/11). Effective limits on navigation-specific telemetry payloads are now being determined by either the 500kb size limit, 10 second duration cutoff and 1000 events (whichever limit is hit first)

If no limit was hit, the telemetry payload will include a non-empty `navigationBatch` property. If a limit was hit, a telemetry payload with `trimmedNavigationBatch` will be submitted instead.
