import type { WorkOrderStockAllocationTO } from 'sf-common/src/models/ApiRequests';

export function parseWorkOrderStockAssignQuantity(raw: string): number | null {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export function buildWorkOrderStockAssignmentsPayload(quantityRaw: string): WorkOrderStockAllocationTO[] {
    const quantity = parseWorkOrderStockAssignQuantity(quantityRaw);
    if (quantity == null) return [];
    return [{ quantity }];
}

export function isWorkOrderStockAssignmentValid(params: {
    quantityRaw: string;
    availableQuantity: number;
    requiredQuantity: number | undefined;
}): boolean {
    const trimmed = params.quantityRaw.trim();
    if (!trimmed) return true;
    const quantity = parseWorkOrderStockAssignQuantity(trimmed);
    if (quantity == null) return false;
    if (quantity > params.availableQuantity) return false;
    const required = params.requiredQuantity ?? Number.MAX_SAFE_INTEGER;
    return quantity <= required;
}
