import { formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';
import type { WorkSessionTO } from 'sf-common/src/models/ApiRequests';

export function todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function parseServerDateTime(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (Array.isArray(value)) {
        const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value as number[];
        const d = new Date(year, month - 1, day, hour, minute, second);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatSessionDateTime(value: unknown): string {
    const d = parseServerDateTime(value);
    return d ? formatEuropeanDateTime(d) : '—';
}

export function operatorLabel(session: Pick<WorkSessionTO, 'operatorName' | 'operatorSurname'>): string {
    const name = [session.operatorName?.trim(), session.operatorSurname?.trim()].filter(Boolean).join(' ');
    return name || '—';
}

export function workOrderSessionLabel(session: Pick<WorkSessionTO, 'workOrderCode' | 'workOrderId'>): string {
    return session.workOrderCode?.trim() || (session.workOrderId != null ? `#${session.workOrderId}` : '—');
}
