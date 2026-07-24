import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createLabAccessToken,
    hasValidLabAccessToken,
    SESSION_MAX_AGE_SECONDS,
} from "$lib/server/labAccess";

describe("lab access token", () => {
    afterEach(() => vi.useRealTimers());

    it("accepts a token signed with the lab password until it expires", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-24T10:00:00Z"));

        const token = createLabAccessToken("lab-password");

        expect(hasValidLabAccessToken(token, "lab-password")).toBe(true);

        vi.setSystemTime(
            new Date("2026-07-24T10:00:00Z").getTime() +
                (SESSION_MAX_AGE_SECONDS + 1) * 1000,
        );
        expect(hasValidLabAccessToken(token, "lab-password")).toBe(false);
    });

    it("rejects forged and malformed tokens", () => {
        const token = createLabAccessToken("lab-password");

        expect(hasValidLabAccessToken(token, "other-password")).toBe(false);
        expect(hasValidLabAccessToken("authenticated", "lab-password")).toBe(false);
        expect(hasValidLabAccessToken("1.not-a-signature", "lab-password")).toBe(false);
    });
});
