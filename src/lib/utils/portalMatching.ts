import type { Order } from "$lib/types";

export interface PortalOrder {
    project_code: string | null;
    order_date: string | null;
    po_number: string | null;
    provider: string;
    sku: string | null;
    description: string;
    quantity: number;
    price: number | null;
    ordered_by: string | null;
}

export type PortalOrderAction = "import" | "link_po" | "ambiguous";

const PO_EXEMPT_PROJECT_CODES = new Set(["l32zzzzzzso"]);

export interface ReconciledPortalOrder extends PortalOrder {
    action: PortalOrderAction;
    existingOrder?: Order;
}

function normalize(value?: string | null): string {
    return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function descriptionSimilarity(a?: string | null, b?: string | null): number {
    const aTokens = new Set(normalize(a).split(/[^a-z0-9]+/).filter(Boolean));
    const bTokens = new Set(normalize(b).split(/[^a-z0-9]+/).filter(Boolean));

    if (aTokens.size === 0 || bTokens.size === 0) return 0;

    const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    return overlap / union;
}

function isStrongCandidate(portalOrder: PortalOrder, order: Order): boolean {
    const portalSku = normalize(portalOrder.sku);
    if (!portalSku || portalSku !== normalize(order.sku)) return false;

    const similarDescription = descriptionSimilarity(
        portalOrder.description,
        order.description,
    ) >= 0.5;
    const sameQuantity = portalOrder.quantity === order.quantity;
    const sameProvider = normalize(portalOrder.provider) === normalize(order.provider);

    return similarDescription || (sameQuantity && sameProvider);
}

function isPoExemptProject(projectCode?: string | null): boolean {
    return PO_EXEMPT_PROJECT_CODES.has(normalize(projectCode));
}

/**
 * Reconciles portal rows without modifying any data. A PO is only proposed for
 * update when one, and only one, existing missing-PO order is a strong match.
 */
export function reconcilePortalOrders(
    portalOrders: PortalOrder[],
    existingOrders: Order[],
): ReconciledPortalOrder[] {
    return portalOrders.flatMap<ReconciledPortalOrder>((portalOrder): ReconciledPortalOrder[] => {
        const poNumber = normalize(portalOrder.po_number);

        if (poNumber && existingOrders.some((order) => normalize(order.po_number) === poNumber)) {
            // A PO is globally unique, so this portal row is already represented.
            return [];
        }

        const exemptProjectMatch = existingOrders.some(
            (order) =>
                isPoExemptProject(order.project_code) &&
                normalize(order.project_code) === normalize(portalOrder.project_code) &&
                isStrongCandidate(portalOrder, order),
        );

        if (exemptProjectMatch) {
            // These orders never receive a PO in Ibecnet, so neither link one
            // nor import a duplicate when the portal shows the same order again.
            return [];
        }

        if (!poNumber) {
            return [{ ...portalOrder, action: "import" }];
        }

        const candidates = existingOrders.filter(
            (order) =>
                !isPoExemptProject(order.project_code) &&
                !normalize(order.po_number) &&
                isStrongCandidate(portalOrder, order),
        );

        if (candidates.length === 1) {
            return [{ ...portalOrder, action: "link_po", existingOrder: candidates[0] }];
        }

        if (candidates.length > 1) {
            return [{ ...portalOrder, action: "ambiguous" }];
        }

        return [{ ...portalOrder, action: "import" }];
    });
}
