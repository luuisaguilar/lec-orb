import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const authFile = path.join(__dirname, "tests/e2e/.auth/user.json");
const webServerEnv = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "html",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "chromium",
            testMatch: /.*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                storageState: authFile,
            },
            dependencies: ["setup"],
        },
    ],
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000",
        env: webServerEnv,
        reuseExistingServer: !process.env.CI,
    },
});
