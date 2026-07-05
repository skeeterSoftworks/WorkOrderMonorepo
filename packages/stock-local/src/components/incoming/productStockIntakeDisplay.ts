import type {
    ProductStockIntakeUnitOfMeasure,
    ProductStockIntakeWorkOrderOptionTO,
} from 'sf-common/src/models/ApiRequests';

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

export function computeSurplusQuantityPreview(
    option: ProductStockIntakeWorkOrderOptionTO | undefined,
    quantity: number,
): number {
    if (!option || quantity <= 0) {
        return 0;
    }
    if (option.internalStockDemand) {
        return quantity;
    }
    const alreadyReceived = option.receivedToStockQuantity ?? 0;
    const required = option.requiredQuantity ?? 0;
    const remainingOrderNeed = Math.max(0, required - alreadyReceived);
    const orderPortion = Math.min(quantity, remainingOrderNeed);
    return quantity - orderPortion;
}

export function productStockIntakeWorkOrderLabel(
    option: ProductStockIntakeWorkOrderOptionTO,
    t: (key: string, opts?: Record<string, unknown>) => string,
): string {
    const ref = option.productReference?.trim() || option.productName?.trim() || `#${option.id ?? '?'}`;
    const base = t('productStockIntakeWorkOrderOptionLabel', {
        id: option.id ?? '?',
        ref,
        produced: option.producedGoodQuantity ?? 0,
        required: option.requiredQuantity ?? 0,
        received: option.receivedToStockQuantity ?? 0,
    });
    if (option.internalStockDemand) {
        return `${base} · ${t('productStockIntakeInternalWorkOrder')}`;
    }
    return base;
}

export function formatSurplusQuantity(
    surplusQuantity: number | undefined,
    unit: ProductStockIntakeUnitOfMeasure | undefined,
    t: (key: string) => string,
): string {
    if (surplusQuantity == null || surplusQuantity <= 0) {
        return '—';
    }
    return formatProductStockIntakeQuantity(surplusQuantity, unit, t);
}
