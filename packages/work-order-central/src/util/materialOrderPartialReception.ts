import type { MaterialOrderLineTO, MaterialOrderTO } from 'sf-common/src/models/ApiRequests';

export type PartialMaterialReceptionItem = {
    orderCode: string;
    orderId?: number;
    lineId?: number;
    materialLabel: string;
    received: number;
    ordered: number;
};

export function isPartiallyReceivedLine(line: MaterialOrderLineTO): boolean {
    const ordered = line.quantity ?? 0;
    if (ordered <= 0) return false;
    const received = line.receivedQuantityTotal ?? 0;
    const remaining = line.remainingQuantity ?? Math.max(0, ordered - received);
    return received > 0 && remaining > 0;
}

export function partialMaterialReceptionItems(orders: MaterialOrderTO[]): PartialMaterialReceptionItem[] {
    const items: PartialMaterialReceptionItem[] = [];
    for (const order of orders) {
        const orderCode = order.code?.trim() || `#${order.id ?? '?'}`;
        for (const line of order.lines ?? []) {
            if (!isPartiallyReceivedLine(line)) continue;
            const received = line.receivedQuantityTotal ?? 0;
            const ordered = line.quantity ?? 0;
            items.push({
                orderCode,
                orderId: order.id,
                lineId: line.id,
                materialLabel: line.materialName?.trim() || line.materialCode?.trim() || '—',
                received,
                ordered,
            });
        }
    }
    return items;
}

export function partialMaterialReceptionByOrderId(
    orders: MaterialOrderTO[],
): Map<number, PartialMaterialReceptionItem[]> {
    const map = new Map<number, PartialMaterialReceptionItem[]>();
    for (const item of partialMaterialReceptionItems(orders)) {
        if (item.orderId == null || !Number.isFinite(item.orderId)) continue;
        const existing = map.get(item.orderId) ?? [];
        existing.push(item);
        map.set(item.orderId, existing);
    }
    return map;
}

export function partialMaterialReceptionSummaryLabel(item: PartialMaterialReceptionItem): string {
    return `${item.orderCode} — ${item.materialLabel} (${item.received}/${item.ordered})`;
}
