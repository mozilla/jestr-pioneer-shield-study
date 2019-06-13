# Test plan for this add-on

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Contents**

- [Manual / QA TEST Instructions](#manual--qa-test-instructions)
  - [Preparations](#preparations)
  - [Install the add-on and enroll in the study](#install-the-add-on-and-enroll-in-the-study)
- [Expected User Experience / Functionality](#expected-user-experience--functionality)
  - [Do these tests (in addition to ordinary regression tests)](#do-these-tests-in-addition-to-ordinary-regression-tests)
  - [Note: checking "sent Telemetry is correct"](#note-checking-sent-telemetry-is-correct)
- [Debug](#debug)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Manual / QA TEST Instructions

### Preparations

- Download a Release version of Firefox

### Install the add-on and enroll in the study

- (Create profile: <https://developer.mozilla.org/Firefox/Multiple_profiles>, or via some other method)
- Navigate to _about:config_ and set the following preferences. (If a preference does not exist, create it be right-clicking in the white area and selecting New -> String)
- Set `shieldStudy.logLevel` to `info`. This permits shield-add-on log output in browser console.
- Make sure that the [Firefox Pioneer Add-on](https://addons.mozilla.org/en-US/firefox/addon/firefox-pioneer/) is installed
- Go to [this study's tracking bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1496154) and install the latest add-on zip file
- (If you are installing an unsigned version of the add-on, you need to set `extensions.legacy.enabled` to `true` before installing the add-on)

## Expected User Experience / Functionality

No user interface elements are modified in this study.

### Do these tests (in addition to ordinary regression tests)

**Manual performance regression test**

- Install the add-on as per above
- Verify that the study runs
- Set/reset `shieldStudy.logLevel` to its default value for new profiles
- Make sure that the add-on is not causing UI freezes on any platform

**Enabling of permanent private browsing before study has begun**

- Enable permanent private browsing
- Install the add-on as per above
- Verify that the study does not run

**Enabling of permanent private browsing after study has begun**

- Install the add-on as per above
- Verify that the study runs
- Enable permanent private browsing
- Verify that the study ends upon the subsequent restart of the browser

**Private browsing mode test 1**

- Install the add-on as per above
- Verify that the study runs
- Verify that no information is recorded and sent when private browsing mode is active

**Mid-study slumber behaves properly test 1**

- Install the add-on as per above
- Verify that the study runs
- Quit Firefox
- Adjust the system clock so that the study is just about to have run for 7 days
- Start Firefox
- Verify that the study runs
- Verify that the study add-on log out includes "We have not yet entered the slumber period. Activate the study and schedule the slumber"
- Surf around
- Verify that payloads are submitted
- Verify that the study add-on log out includes "Scheduling mid-study slumber to start in # minutes", where # is a small number of minutes.
- Wait a few minutes (for the slumber period to start)
- Verify that the study add-on log out includes "Mid-study slumber start".
- Surf around
- Verify that no payloads are submitted (except for possibly those stemming from one final payload processing, shown in the logs as "Sending the X navigation batches that are old enough")

**Mid-study slumber behaves properly test 2**

- Install the add-on as per above
- Verify that the study runs
- Quit Firefox
- Adjust the system clock so that the study is just about to have run for 14 days
- Start Firefox
- Verify that the study runs
- Verify that the study add-on log out includes "We have entered the slumber period. Do not activate the study but schedule the re-activation"
- Surf around
- Verify that no payloads are submitted
- Verify that the study add-on log out does not include "Scheduling mid-study slumber to start in # minutes"
- Verify that the study add-on log out includes "Scheduling mid-study slumber to stop in # minutes", where # is a small number of minutes.
- Wait a few minutes (for the slumber period to stop)
- Verify that the study add-on log out includes "Mid-study slumber stop".
- Surf around
- Verify that payloads are submitted

**Mid-study slumber behaves properly test 3**

- Install the add-on as per above
- Verify that the study runs
- Quit Firefox
- Adjust the system clock so that the study has run for 16 days
- Start Firefox
- Verify that the study runs
- Verify that the study add-on log out includes "We are back after the slumber, simply activate the study and wait for study to expire"
- Verify that the study add-on log out does not include "Scheduling mid-study slumber to stop in # minutes"
- Surf around
- Verify that payloads are submitted

### Note: checking "sent Telemetry is correct"

- Open the Browser Console using Firefox's top menu at `Tools > Web Developer > Browser Console`. This will display Shield (loading/telemetry) log output from the add-on.
- To get an idea of how often telemetry is sent and calculated ping sizes, set `shieldStudy.logLevel` to `log`. This permits log-level shield-add-on log output in the browser console which includes high-level log messages regarding sent telemetry payloads.
- To get an idea of how often [OpenWPM](https://github.com/mozilla/openwpm-webext-instrumentation) instruments a JS/HTTP/COOKIE event, set `shieldStudy.logLevel` to `info`. This permits info-level shield-add-on log output in the browser console which includes high-level log messages regarding received OpenWPM packages.
- To inspect the unencrypted contents individual telemetry packets, set `shieldStudy.logLevel` to `all`. This permits debug-level shield-add-on log output in the browser console. Note that this will negatively affect the performance of Firefox.
- To see the actual (encrypted) payloads, go to `about:telemetry` -> Click `current ping` -> Select `Archived ping data` -> Ping Type `pioneer-study` -> Choose a payload -> Raw Payload

See [TELEMETRY.md](./TELEMETRY.md) for more details on what pings are sent by this add-on.

## Debug

To debug installation and loading of the add-on:

- Open the Browser Console using Firefox's top menu at `Tools > Web Developer > Browser Console`. This will display Shield (loading/telemetry) and log output from the add-on.
