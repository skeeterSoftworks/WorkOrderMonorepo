import type { MaterialTO, StockLocationTO } from '../models/ApiRequests';

/** Material catalogue ID as shown in stock-by-location tables (`material.code`). */
export function materialCatalogueId(material?: MaterialTO): string {
    return (material?.code ?? '').trim();
}

export function collectStockCatalogueIds(locations: StockLocationTO[]): string[] {
    const ids = new Set<string>();
    for (const loc of locations) {
        for (const sm of loc.stockedMaterials ?? []) {
            const id = materialCatalogueId(sm.material);
            if (id) {
                ids.add(id);
            }
        }
    }
    return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Keeps only locations and materials matching the catalogue ID; empty filter returns all locations. */
export function filterStockLocationsByCatalogueId(
    locations: StockLocationTO[],
    catalogueId: string,
): StockLocationTO[] {
    const needle = catalogueId.trim();
    if (!needle) {
        return locations;
    }
    const lowerNeedle = needle.toLowerCase();
    return locations
        .map((loc) => ({
            ...loc,
            stockedMaterials: (loc.stockedMaterials ?? []).filter(
                (sm) => materialCatalogueId(sm.material).toLowerCase() === lowerNeedle,
            ),
        }))
        .filter((loc) => (loc.stockedMaterials?.length ?? 0) > 0);
}
