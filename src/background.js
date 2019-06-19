/* global getStudySetup, feature */

/**
 *  Goal:  Implement an instrumented feature using `browser.study` API
 *
 *  Every runtime:
 *  - Prepare
 *
 *    - listen for `onEndStudy` (study endings)
 *    - listen for `study.onReady`
 *
 *  - Startup the feature
 *
 *    - attempt to `browser.study.setup` the study using our studySetup
 *
 *      - will fire EITHER
 *        -  `endStudy` (`expired`, `ineligible`)
 *        - onReady
 *      - (see docs for `browser.study.setup`)
 *
 *    - onReady: configure the feature to match the `variation` study selected
 *    - or, if we got an `onEndStudy` cleanup and uninstall.
 *
 *  During the feature:
 *    - `sendTelemetry` to send pings
 *    - `endStudy` to force an ending (for positive or negative reasons!)
 *
 *  Interesting things to try next:
 *  - `browser.study.validateJSON` your pings before sending
 *  - `endStudy` different endings in response to user action
 *  - force an override of setup.testing to choose branches.
 *
 */

let studyLengthInDays;
const defaultSlumberStartDay = 7;
const defaultSlumberEndDay = 14;

class StudyLifeCycleHandler {
  /**
   * Listen to onEndStudy, onReady
   * `browser.study.setup` fires onReady OR onEndStudy
   *
   * call `this.enableFeature` to actually do the feature/experience/ui.
   */
  constructor() {
    /*
     * IMPORTANT:  Listen for `onEndStudy` before calling `browser.study.setup`
     * because:
     * - `setup` can end with 'ineligible' due to 'allowEnroll' key in first session.
     *
     */
    browser.study.onEndStudy.addListener(this.handleStudyEnding.bind(this));
    browser.study.onReady.addListener(this.enableFeature.bind(this));
    this.expirationAlarmName = `${browser.runtime.id}:studyExpiration`;
    this.slumberStartAlarmName = `${browser.runtime.id}:slumberStart`;
    this.slumberStopAlarmName = `${browser.runtime.id}:slumberStop`;
  }

  /**
   * Cleanup
   *
   * (If you have privileged code, you might need to clean
   *  that up as well.
   * See:  https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/lifecycle.html
   *
   * @returns {undefined}
   */
  async cleanup() {
    await browser.storage.local.clear();
    await browser.alarms.clear(this.expirationAlarmName);
    await browser.alarms.clear(this.slumberStartAlarmName);
    await browser.alarms.clear(this.slumberStopAlarmName);
    await feature.cleanup();
  }

  /**
   *
   * side effects
   * - set up expiration alarms
   * - make feature/experience/ui with the particular variation for this user.
   *
   * @param {object} studyInfo browser.study.studyInfo object
   *
   * @returns {undefined}
   */
  async enableFeature(studyInfo) {
    await browser.study.logger.log(["Enabling experiment", studyInfo]);
    const { delayInMinutes } = studyInfo;
    // Study utils has guaranteed that the study has not yet expired
    // but we have to schedule the expiration so that it indeed expires
    // when it is supposed to
    const theStudyExpiresInThisManyMinutes = delayInMinutes;
    if (theStudyExpiresInThisManyMinutes !== undefined) {
      await browser.study.logger.log(
        `Scheduling study expiration in ${delayInMinutes / 24 / 60} days`,
      );
      const alarmName = this.expirationAlarmName;
      const alarmListener = async alarm => {
        if (alarm.name === alarmName) {
          browser.alarms.onAlarm.removeListener(alarmListener);
          await browser.study.endStudy("expired");
        }
      };
      browser.alarms.onAlarm.addListener(alarmListener);
      browser.alarms.create(alarmName, {
        delayInMinutes: theStudyExpiresInThisManyMinutes,
      });
    }

    // Figure out where in the study life-cycle we are and schedule appropriate
    // actions based on this

    const studyLengthInMinutes = studyLengthInDays * 24 * 60;
    const studyDurationInMinutesSoFar =
      studyLengthInMinutes - theStudyExpiresInThisManyMinutes;
    const studyDurationInDaysSoFar = studyDurationInMinutesSoFar / 24 / 60;
    const slumberStartDay = await this.slumberStartDay();
    const slumberStartMinute = slumberStartDay * 24 * 60; // At the beginning of the start day
    const slumberEndDay = await this.slumberEndDay();
    const slumberEndMinute = slumberEndDay * 24 * 60; // At the beginning of the end day

    await browser.study.logger.debug([
      "Slumber debug",
      {
        studyLengthInDays,
        studyLengthInMinutes,
        studyDurationInMinutesSoFar,
        studyDurationInDaysSoFar,
      },
      { slumberStartDay, slumberStartMinute, slumberEndDay, slumberEndMinute },
    ]);

    if (studyDurationInMinutesSoFar > slumberEndMinute) {
      await browser.study.logger.log(
        "We are back after the slumber, simply activate the study and wait for study to expire",
      );
      await feature.configure(studyInfo);
    } else if (studyDurationInMinutesSoFar > slumberStartMinute) {
      await browser.study.logger.log(
        "We have entered the slumber period. Do not activate the study but schedule the re-activation",
      );
      await feature.configure(studyInfo);
      await feature.pause();
      await this.scheduleSlumberStop(
        slumberEndMinute - studyDurationInMinutesSoFar,
      );
    } else {
      await browser.study.logger.log(
        "We have not yet entered the slumber period. Activate the study and schedule the slumber",
      );
      await feature.configure(studyInfo);
      await this.scheduleSlumberStart(
        slumberStartMinute - studyDurationInMinutesSoFar,
      );
      await this.scheduleSlumberStop(
        slumberEndMinute - studyDurationInMinutesSoFar,
      );
    }

    return true;
  }

  /**
   * scheduleSlumberStart
   *
   * @param {number} delayInMinutes When to schedule
   *
   * @returns {undefined}
   */
  async scheduleSlumberStart(delayInMinutes) {
    const alarmName = this.slumberStartAlarmName;
    await browser.study.logger.log(
      `Scheduling mid-study slumber to start in ${delayInMinutes} minutes (${delayInMinutes /
        24 /
        60} days)`,
    );
    const alarmListener = async alarm => {
      if (alarm.name === alarmName) {
        await browser.study.logger.log(`Mid-study slumber start`);
        browser.alarms.onAlarm.removeListener(alarmListener);
        await feature.pause();
      }
    };
    browser.alarms.onAlarm.addListener(alarmListener);
    browser.alarms.create(alarmName, {
      delayInMinutes,
    });
    return true;
  }

  async slumberStartDay() {
    const override = await browser.testingOverrides.getSlumberStartDayOverride();
    if (override) {
      return override;
    }
    return defaultSlumberStartDay;
  }

  /**
   * @param {number} delayInMinutes When to schedule
   *
   * @returns {undefined}
   */
  async scheduleSlumberStop(delayInMinutes) {
    const alarmName = this.slumberStopAlarmName;
    await browser.study.logger.log(
      `Scheduling mid-study slumber to stop in ${delayInMinutes} minutes (${delayInMinutes /
        24 /
        60} days)`,
    );
    const alarmListener = async alarm => {
      if (alarm.name === alarmName) {
        await browser.study.logger.log(`Mid-study slumber stop`);
        browser.alarms.onAlarm.removeListener(alarmListener);
        await feature.resume();
      }
    };
    browser.alarms.onAlarm.addListener(alarmListener);
    browser.alarms.create(alarmName, {
      delayInMinutes,
    });
    return true;
  }

  async slumberEndDay() {
    const override = await browser.testingOverrides.getSlumberEndDayOverride();
    if (override) {
      return override;
    }
    return defaultSlumberEndDay;
  }

  /** handles `study:end` signals
   *
   * - opens 'ending' urls (surveys, for example)
   * - calls cleanup
   *
   * @param {object} ending An ending result
   *
   * @returns {undefined}
   */
  async handleStudyEnding(ending) {
    await browser.study.logger.log([`Study wants to end:`, ending]);
    for (const url of ending.urls) {
      await browser.tabs.create({ url });
    }
    switch (ending.endingName) {
      // could have different actions depending on positive / ending names
      default:
        await browser.study.logger.log(`The ending: ${ending.endingName}`);
        await this.cleanup();
        break;
    }
    // actually remove the addon.
    await browser.study.logger.log("About to actually uninstall");
    return browser.management.uninstallSelf();
  }
}

/**
 * Run every startup to get config and instantiate the feature
 *
 * @returns {undefined}
 */
async function onEveryExtensionLoad() {
  new StudyLifeCycleHandler();

  const studySetup = await getStudySetup();
  studyLengthInDays = studySetup.expire.days;
  await browser.study.logger.log([`Study setup: `, studySetup]);
  await browser.study.setup(studySetup);
}
onEveryExtensionLoad();
