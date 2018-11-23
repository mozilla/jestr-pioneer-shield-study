import { parse } from "date-fns";
import { dateTimeUnicodeFormatString } from "openwpm-webext-instrumentation";

export const parseIsoDateTimeString = isoDateTimeString => {
  return parse(isoDateTimeString, dateTimeUnicodeFormatString, new Date());
};
