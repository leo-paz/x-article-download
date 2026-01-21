// src/auth.test.ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { getCookiesPath, loadCookies, saveCookies, clearCookies } from "./auth";
import fs from "fs";
import path from "path";

const TEST_CONFIG_DIR = "/tmp/x-article-test";

describe("auth", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  test("getCookiesPath returns correct path", () => {
    const cookiesPath = getCookiesPath(TEST_CONFIG_DIR);
    expect(cookiesPath).toBe(`${TEST_CONFIG_DIR}/cookies.json`);
  });

  test("loadCookies returns undefined when no cookies exist", () => {
    const cookies = loadCookies(TEST_CONFIG_DIR);
    expect(cookies).toBeUndefined();
  });

  test("saveCookies and loadCookies roundtrip", () => {
    const testCookies = [{ name: "auth", value: "token123", domain: ".x.com" }];
    saveCookies(testCookies, TEST_CONFIG_DIR);
    const loaded = loadCookies(TEST_CONFIG_DIR);
    expect(loaded).toEqual(testCookies);
  });

  test("clearCookies removes cookie file", () => {
    const testCookies = [{ name: "auth", value: "token123", domain: ".x.com" }];
    saveCookies(testCookies, TEST_CONFIG_DIR);
    clearCookies(TEST_CONFIG_DIR);
    expect(loadCookies(TEST_CONFIG_DIR)).toBeUndefined();
  });
});
