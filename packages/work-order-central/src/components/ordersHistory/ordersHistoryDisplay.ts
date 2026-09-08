import { formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';

export function formatHistoryDateTime(value: unknown): string {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) {
        const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value as number[];
        const d = new Date(year, month - 1, day, hour, minute, second);
        return Number.isNaN(d.getTime()) ? '—' : formatEuropeanDateTime(d);
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? '—' : formatEuropeanDateTime(d);
}

export function customerHistoryLabel(customer: { companyName?: string; buyerId?: string; id?: number }): string {
    const name = customer.companyName?.trim() || '';
    const buyerId = customer.buyerId?.trim();
    if (name && buyerId) return `${name} (${buyerId})`;
    return name || buyerId || (customer.id != null ? `#${customer.id}` : '—');
}

function parseHistoryAmount(value: number | string | null | undefined): number | null {
    if (value == null || value === '') return null;
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? amount : null;
}

export function formatHistoryPrice(
    pricePerUnit: number | string | null | undefined,
    currency?: string | null,
): string {
    const value = parseHistoryAmount(pricePerUnit);
    if (value == null) return '—';
    const amount = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    const code = currency?.trim();
    return code ? `${amount} ${code}` : amount;
}

export function formatHistoryLineTotal(
    quantity: number | null | undefined,
    pricePerUnit: number | string | null | undefined,
    currency?: string | null,
): string {
    const unit = parseHistoryAmount(pricePerUnit);
    if (unit == null) return '—';
    return formatHistoryPrice((quantity ?? 0) * unit, currency);
}
