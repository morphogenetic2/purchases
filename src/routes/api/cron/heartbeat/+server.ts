import { json, type RequestHandler } from "@sveltejs/kit";
import { CRON_SECRET } from "$env/static/private";
import { supabaseAdmin } from "$lib/server/supabaseAdmin";

/**
 * Vercel invokes this endpoint on the configured schedule. It performs a
 * metadata-only query, keeping the Supabase project active without returning
 * any purchase data.
 */
export const GET: RequestHandler = async ({ request }) => {
    if (
        !CRON_SECRET ||
        request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`
    ) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
        .from("orders")
        .select("id", { head: true, count: "exact" });

    if (error) {
        console.error("Supabase heartbeat failed:", error.message);
        return json({ error: "Heartbeat query failed" }, { status: 503 });
    }

    return json({ ok: true });
};
