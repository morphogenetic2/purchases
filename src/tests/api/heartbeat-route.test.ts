import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseState = vi.hoisted(() => ({
    fromMock: vi.fn(),
    selectMock: vi.fn(),
}));

vi.mock("$env/static/private", () => ({
    CRON_SECRET: "test-cron-secret",
}));

vi.mock("$lib/server/supabaseAdmin", () => ({
    supabaseAdmin: {
        from: supabaseState.fromMock,
    },
}));

import { GET } from "../../routes/api/cron/heartbeat/+server";

function makeRequest(authorization?: string): Request {
    return new Request("http://localhost/api/cron/heartbeat", {
        headers: authorization ? { authorization } : {},
    });
}

describe("GET /api/cron/heartbeat", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseState.selectMock.mockResolvedValue({ error: null });
        supabaseState.fromMock.mockReturnValue({
            select: supabaseState.selectMock,
        });
    });

    it("rejects requests that are not from Vercel Cron", async () => {
        const response = await GET({ request: makeRequest() } as any);

        expect(response.status).toBe(401);
        expect(supabaseState.fromMock).not.toHaveBeenCalled();
    });

    it("performs a metadata-only query for an authorized request", async () => {
        const response = await GET({
            request: makeRequest("Bearer test-cron-secret"),
        } as any);

        expect(response.status).toBe(200);
        expect(supabaseState.fromMock).toHaveBeenCalledWith("orders");
        expect(supabaseState.selectMock).toHaveBeenCalledWith("id", {
            head: true,
            count: "exact",
        });
    });
});
