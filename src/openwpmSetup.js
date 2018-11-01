/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "getOpenwpmConfig" }]*/

/**
 *  Overview:
 *
 *  - constructs a well-formatted `openwpmConfig` for use by `feature.startOpenWPMInstrumentation()`
 *  - mostly declarative, except that some fields are set at runtime
 *    asynchronously.
 */

/**
 * Base for openwpmConfig, as used by `browser.openwpm.start`.
 *
 * Will be augmented by 'getOpenwpmConfig'
 */
const baseOpenwpmConfig = {
  navigation_instrument: true,
  cookie_instrument: true,
  js_instrument: true,
  http_instrument: true,
  save_javascript: false,
  save_all_content: false,
  crawl_id: "pioneer",
};

/**
 * Augment declarative openwpmConfig with any necessary async values
 *
 * @return {object} openwpmConfig A complete openwpm config object
 */
async function getOpenwpmConfig() {
  // shallow copy
  const openwpmConfig = Object.assign({}, baseOpenwpmConfig);

  // override keys various ways, such as by prefs
  // TODO

  return openwpmConfig;
}
