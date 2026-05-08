import fs from "node:fs";
import path from "node:path";
import { expect, test as setup, type Page } from "@playwright/test";

type Credentials = {
    email: string;
    password: string;
    label: string;
};

const authFile = path.join(__dirname, ".auth", "user.json");

function getCredentials(): Credentials[] {
    const candidates = [
        {
            email: process.env.PLAYWRIGHT_E2E_EMAIL,
            password: process.env.PLAYWRIGHT_E2E_PASSWORD,
            label: "primary",
        },
        {
            email: process.env.PLAYWRIGHT_E2E_FALLBACK_EMAIL,
            password: process.env.PLAYWRIGHT_E2E_FALLBACK_PASSWORD,
            label: "fallback",
        },
    ];

    return candidates.filter(
        (candidate): candidate is Credentials =>
            Boolean(candidate.email && candidate.password)
    );
}

async function attemptLogin(page: Page, credentials: Credentials) {
    let navigated = false;
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
            navigated = true;
            break;
        } catch (error) {
            lastError = error;
            await page.waitForTimeout(1_000);
        }
    }

    if (!navigated) {
        throw lastError instanceof Error ? lastError : new Error("Unable to open /login after retries");
    }

    await page.locator("#email").fill(credentials.email);
    await page.locator("#password").fill(credentials.password);
    await page.locator("form button[type='submit']").click();

    try {
        await page.waitForURL(
            (url) => !url.pathname.startsWith("/login"),
            { timeout: 20_000 }
        );
        return { success: true as const, detail: `authenticated with ${credentials.label}` };
    } catch {
        const detail = await page
            .locator(".text-destructive")
            .allTextContents()
            .then((messages) => messages.join(" ").trim())
            .catch(() => "");

        return {
            success: false as const,
            detail: detail || `still on ${page.url()}`,
        };
    }
}

setup("authenticate e2e user", async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000);
    const credentials = getCredentials();

    if (credentials.length === 0) {
        throw new Error(
            "Missing E2E credentials. Set PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD in .env.local."
        );
    }

    fs.mkdirSync(path.dirname(authFile), { recursive: true });

    let lastFailure = "";

    for (const candidate of credentials) {
        const result = await attemptLogin(page, candidate);

        if (result.success) {
            await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
            await page.context().storageState({ path: authFile });
            return;
        }

        lastFailure = `${candidate.label}: ${result.detail}`;
    }

    throw new Error(`Unable to authenticate Playwright user. Last failure: ${lastFailure}`);
});
