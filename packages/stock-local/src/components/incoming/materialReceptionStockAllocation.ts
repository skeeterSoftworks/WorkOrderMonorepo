import type {
    MaterialReceptionStockAllocationTO,
    StockLocationTO,
} from 'sf-common/src/models/ApiRequests';

export type StockAllocationRow = {
    key: string;
    stockLocationId: number | '';
    quantity: string;
};

let rowKeyCounter = 0;

export function newAllocationRow(): StockAllocationRow {
    rowKeyCounter += 1;
    return { key: `alloc-${rowKeyCounter}`, stockLocationId: '', quantity: '' };
}

export function parseReceivedQuantity(raw: string): number | null {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export function sumAllocationQuantities(rows: StockAllocationRow[]): number {
    return rows.reduce((sum, row) => {
        const n = Number.parseInt(row.quantity, 10);
        if (!Number.isFinite(n) || n <= 0) return sum;
        return sum + n;
    }, 0);
}

export function buildStockAllocationsPayload(
    rows: StockAllocationRow[],
): MaterialReceptionStockAllocationTO[] {
    const merged = new Map<number, number>();
    for (const row of rows) {
        if (row.stockLocationId === '' || !row.stockLocationId) continue;
        const qty = Number.parseInt(row.quantity, 10);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        merged.set(row.stockLocationId, (merged.get(row.stockLocationId) ?? 0) + qty);
    }
    return Array.from(merged.entries()).map(([stockLocationId, quantity]) => ({
        stockLocationId,
        quantity,
    }));
}

export function isReceiveFormValid(params: {
    receivedQuantity: string;
    orderQuantity: number | undefined;
    allocationRows: StockAllocationRow[];
}): boolean {
    const received = parseReceivedQuantity(params.receivedQuantity);
    if (received == null || params.orderQuantity == null || received !== params.orderQuantity) {
        return false;
    }
    const allocated = sumAllocationQuantities(params.allocationRows);
    if (allocated !== received) return false;
    const payload = buildStockAllocationsPayload(params.allocationRows);
    if (payload.length === 0) return false;
    for (const row of params.allocationRows) {
        if (row.stockLocationId === '' || !row.quantity.trim()) return false;
        const qty = Number.parseInt(row.quantity, 10);
        if (!Number.isFinite(qty) || qty <= 0) return false;
    }
    const usedLocationIds = new Set<number>();
    for (const row of params.allocationRows) {
        if (row.stockLocationId === '') continue;
        if (usedLocationIds.has(row.stockLocationId)) return false;
        usedLocationIds.add(row.stockLocationId);
    }
    return true;
}

export function stockLocationsForSelect(locations: StockLocationTO[]): StockLocationTO[] {
    return [...locations].sort((a, b) =>
        (a.stockLocationCode ?? '').localeCompare(b.stockLocationCode ?? '', undefined, {
            sensitivity: 'base',
        }),
    );
}
