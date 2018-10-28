# Test plan for this add-on

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Contents**

- [Manual / QA TEST Instructions](#manual--qa-test-instructions)
  - [Preparations](#preparations)
  - [Install the add-on and enroll in the study](#install-the-add-on-and-enroll-in-the-study)
- [Expected User Experience / Functionality](#expected-user-experience--functionality)
  - [Do these tests](#do-these-tests)
  - [Design](#design)
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
- Go to [this study's tracking bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1496154) and install the latest add-on zip file

## Expected User Experience / Functionality

No user interface elements are modified in this study.

### Do these tests

Ordinary regression tests.

### Note: checking "sent Telemetry is correct"

- Set `shieldStudy.logLevel` to `all`. This permits debug-level shield-add-on log output in the browser console. Note that this will negatively affect the performance of Firefox.
- Open the Browser Console using Firefox's top menu at `Tools > Web Developer > Browser Console`. This will display Shield (loading/telemetry) log output from the add-on.

See [TELEMETRY.md](./TELEMETRY.md) for more details on what pings are sent by this add-on.

## Debug

To debug installation and loading of the add-on:

- Open the Browser Console using Firefox's top menu at `Tools > Web Developer > Browser Console`. This will display Shield (loading/telemetry) and log output from the add-on.
