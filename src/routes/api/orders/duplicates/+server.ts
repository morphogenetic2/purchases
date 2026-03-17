import { json } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/supabaseAdmin";
import {
    compareOrdersForResolution,
    deriveMergedOrderState,
    findDuplicateGroups,
} from "$lib/utils/duplicates";
import type { ResolveDuplicateGroupPayload } from "$lib/types";

function validatePayload(body: unknown): ResolveDuplicateGroupPayload | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const payload = body as Partial<ResolveDuplicateGroupPayload>;
    const ids = Array.isArray(payload.ids)
        ? Array.from(
            new Set(
                payload.ids.filter(
                    (value): value is string =>
                        typeof value === "string" && value.trim().length > 0,
                ),
            ),
        )
        : [];

    if (
        (payload.action !== "merge" && payload.action !== "delete") ||
        typeof payload.groupKey !== "string" ||
        payload.groupKey.length === 0 ||
        ids.length < 2
    ) {
        return null;
    }

    return {
        action: payload.action,
        groupKey: payload.groupKey,
        ids,
    };
}

export async function POST({ request }) {
    const rawPayload = await request.json();
    const payload = validatePayload(rawPayload);

    if (!payload) {
        return json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data: orders, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .in("id", payload.ids);

    if (fetchError) {
        return json({ error: fetchError.message }, { status: 500 });
    }

    if (!orders || orders.length < 2) {
        return json({ error: "Duplicate group not found" }, { status: 404 });
    }

    const matchedGroup = findDuplicateGroups(orders).find(
        (group) => group.key === payload.groupKey,
    );

    if (!matchedGroup || matchedGroup.orders.length !== payload.ids.length) {
        return json(
            { error: "Orders no longer match the selected duplicate group" },
            { status: 409 },
        );
    }

    const sortedOrders = [...matchedGroup.orders].sort(compareOrdersForResolution);
    const keeper = sortedOrders[0];
    const duplicates = sortedOrders.slice(1);
    const duplicateIds = duplicates.map((order) => order.id);

    if (payload.action === "merge") {
        const mergedState = deriveMergedOrderState(sortedOrders);
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
            .from("orders")
            .update(mergedState)
            .eq("id", keeper.id)
            .select()
            .single();

        if (updateError) {
            return json({ error: updateError.message }, { status: 500 });
        }

        const { error: deleteError } = await supabaseAdmin
            .from("orders")
            .delete()
            .in("id", duplicateIds);

        if (deleteError) {
            return json({ error: deleteError.message }, { status: 500 });
        }

        return json({
            data: {
                action: payload.action,
                keptOrderId: keeper.id,
                removedOrderIds: duplicateIds,
                updatedOrder,
            },
        });
    }

    const { error: deleteError } = await supabaseAdmin
        .from("orders")
        .delete()
        .in("id", duplicateIds);

    if (deleteError) {
        return json({ error: deleteError.message }, { status: 500 });
    }

    return json({
        data: {
            action: payload.action,
            keptOrderId: keeper.id,
            removedOrderIds: duplicateIds,
            updatedOrder: keeper,
        },
    });
}
