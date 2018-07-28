/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "getOpenwpmSetup" }]*/

/**
 *  Overview:
 *
 *  - constructs a well-formatted `openwpmSetup` for use by `browser.openwpm.start`
 *  - mostly declarative, except that some fields are set at runtime
 *    asynchronously.
 */

/**
 * Base for openwpmSetup, as used by `browser.openwpm.start`.
 *
 * Will be augmented by 'getOpenwpmSetup'
 */
const baseOpenwpmSetup = {
  cookie_instrument: false,
  js_instrument: false,
  cp_instrument: false,
  http_instrument: false,
  save_javascript: false,
  save_all_content: false,
};

/**
 * Augment declarative openwpmSetup with any necessary async values
 *
 * @return {object} openwpmSetup A complete openwpm setup object
 */
async function getOpenwpmSetup() {
  // shallow copy
  const openwpmSetup = Object.assign({}, baseOpenwpmSetup);

  // override keys various ways, such as by prefs
  // TODO

  return openwpmSetup;
}
