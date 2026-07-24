import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sign(expiresAt: string, password: string): string {
    return createHmac("sha256", password).update(expiresAt).digest("hex");
}

/**
 * Creates a stateless, tamper-evident session value for the shared lab login.
 * The cookie expires after one week and cannot be forged without LAB_PASSWORD.
 */
export function createLabAccessToken(password: string): string {
    const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS);
    return `${expiresAt}.${sign(expiresAt, password)}`;
}

export function hasValidLabAccessToken(token: string | undefined, password: string): boolean {
    if (!token) return false;

    const [expiresAt, signature, ...extra] = token.split(".");
    const expiry = Number(expiresAt);

    if (
        extra.length > 0 ||
        !expiresAt ||
        !signature ||
        !/^[a-f0-9]{64}$/i.test(signature) ||
        !Number.isSafeInteger(expiry) ||
        expiry <= Math.floor(Date.now() / 1000)
    ) {
        return false;
    }

    const expectedSignature = sign(expiresAt, password);
    return timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex"),
    );
}
