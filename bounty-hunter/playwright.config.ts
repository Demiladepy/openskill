import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    trace: "on",
    screenshot: "only-on-failure",
    headless: true
  }
});
