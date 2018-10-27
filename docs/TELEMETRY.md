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

The add-on listens to navigation, web requests, cookie modifications and access to certain javascript API:s, as determined by [openwpm-webext-instrumentation](https://github.com/mozilla/openwpm-webext-instrumentation).

The data received from the instrumentation is in turn sent as encrypted telemetry packages using [shield-studies-addon-utils](https://github.com/mozilla/shield-studies-addon-utils).

### Attributes

TODO
