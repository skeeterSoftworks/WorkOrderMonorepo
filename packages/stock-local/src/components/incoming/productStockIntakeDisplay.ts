import type { ProductStockIntakeUnitOfMeasure } from 'sf-common/src/models/ApiRequests';

export function productStockIntakeUnitLabel(
    unit: ProductStockIntakeUnitOfMeasure | undefined,
    t: (key: string) => string,
): string {
    if (!unit) {
        return '—';
    }
    return t(`productStockIntakeUnit_${unit}`);
}

export function formatProductStockIntakeQuantity(
    quantity: number | undefined,
    unit: ProductStockIntakeUnitOfMeasure | undefined,
    t: (key: string) => string,
): string {
    if (quantity == null) {
        return '—';
    }
    const unitLabel = productStockIntakeUnitLabel(unit, t);
    return `${quantity} ${unitLabel}`;
}

export function formatReceivedAt(value: string | undefined): string {
    if (!value) {
        return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
}
