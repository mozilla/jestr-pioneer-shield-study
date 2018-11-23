import { assert } from "chai";
import { parseIsoDateTimeString } from "./dateUtils";

describe("dateUtils", function() {
  describe("parseIsoDateTimeString", function() {
    it("ISO date time strings should be parsable", function() {
      const dateTimeIsoString = "2018-11-22T23:13:05.622Z";
      const parsedDateTime = parseIsoDateTimeString(dateTimeIsoString);
      assert.equal(parsedDateTime.toISOString(), dateTimeIsoString);
    });
  });
});
