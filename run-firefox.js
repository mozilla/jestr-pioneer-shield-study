/* eslint-env node */
/* global browser */

// for unhandled promise rejection debugging
process.on("unhandledRejection", r => console.error(r)); // eslint-disable-line no-console

const utils = require("./test/functional/utils");

const STUDY_TYPE = process.env.STUDY_TYPE || "pioneer";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const run = async (studyType, shieldStudyLogLevel) => {
  const driver = await utils.setupWebdriver.promiseSetupDriver(
    utils.FIREFOX_PREFERENCES,
  );
  const widgetId = utils.ui.makeWidgetId(
    "jestr-pioneer-shield-study@pioneer.mozilla.org",
  );
  await utils.preferences.set(
    driver,
    `extensions.${widgetId}.test.studyType`,
    studyType,
  );
  await utils.preferences.set(
    driver,
    `shieldStudy.logLevel`,
    shieldStudyLogLevel,
  );
  if (studyType === "pioneer") {
    await utils.setupWebdriver.installPioneerOptInAddon(driver);
  }
  await utils.setupWebdriver.installAddon(driver);
  await utils.ui.openBrowserConsole(driver);

  await driver.sleep(1000 * 60 * 60 * 24);
  driver.quit();
};

run(STUDY_TYPE, LOG_LEVEL);
