import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyApplicationWindow,
  parseSeoulDateTime,
  toSeoulInputValue,
} from "../app/lib/application-window-utils.ts";

const setting = {
  applicationStart: "2026-08-20T10:00:00.000Z",
  applicationEnd: "2026-08-20T10:30:00.000Z",
  isOpen: true,
};

test("application window boundary states use start <= now < end", () => {
  assert.equal(classifyApplicationWindow(null, "2026-08-20T10:00:00.000Z"), "NOT_CONFIGURED");
  assert.equal(classifyApplicationWindow(setting, "2026-08-20T09:50:00.000Z"), "BEFORE");
  assert.equal(classifyApplicationWindow(setting, "2026-08-20T10:00:00.000Z"), "OPEN");
  assert.equal(classifyApplicationWindow(setting, "2026-08-20T10:15:00.000Z"), "OPEN");
  assert.equal(classifyApplicationWindow(setting, "2026-08-20T10:30:00.000Z"), "CLOSED");
  assert.equal(classifyApplicationWindow(setting, "2026-08-20T10:31:00.000Z"), "CLOSED");
  assert.equal(classifyApplicationWindow({ ...setting, isOpen: false }, "2026-08-20T10:15:00.000Z"), "CLOSED");
});

test("Seoul local input is stored as UTC without depending on browser timezone", () => {
  const utc = parseSeoulDateTime("2026-08-20T19:00");
  assert.equal(utc, "2026-08-20T10:00:00.000Z");
  assert.equal(toSeoulInputValue(utc), "2026-08-20T19:00");
});

test("invalid or non-increasing date input is rejected by parsing and validation", () => {
  assert.equal(parseSeoulDateTime("2026-02-31T19:00"), null);
  assert.equal(parseSeoulDateTime("not-a-date"), null);
  const start = parseSeoulDateTime("2026-08-20T19:00");
  const sameEnd = parseSeoulDateTime("2026-08-20T19:00");
  assert.ok(start && sameEnd && new Date(sameEnd).getTime() <= new Date(start).getTime());
});
