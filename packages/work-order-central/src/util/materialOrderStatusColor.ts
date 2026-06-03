import type { MaterialOrderStatus } from 'sf-common/src/models/ApiRequests';

const STATUS_START_COLOR = '#aa00ff';
const STATUS_END_COLOR = '#00e676';
export const MATERIAL_ORDER_REJECTED_COLOR = '#ff1744';

export const MATERIAL_ORDER_STATUS_PROGRESSION: MaterialOrderStatus[] = [
    'ORDER_CREATED',
    'ORDER_SENT',
    'ORDER_ACKNOWLEDGED',
    'ORDER_ACCEPTED',
    'IN_TRANSPORT',
    'RECEIVED_IN_STOCK',
    'VALIDATED',
];

function interpolateHex(from: string, to: string, t: number): string {
    const parse = (hex: string) => {
        const normalized = hex.replace('#', '');
        return [
            Number.parseInt(normalized.slice(0, 2), 16),
            Number.parseInt(normalized.slice(2, 4), 16),
            Number.parseInt(normalized.slice(4, 6), 16),
        ];
    };
    const [r1, g1, b1] = parse(from);
    const [r2, g2, b2] = parse(to);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const STATUS_COLORS = MATERIAL_ORDER_STATUS_PROGRESSION.reduce(
    (colors, status, index, progression) => {
        const t = progression.length <= 1 ? 0 : index / (progression.length - 1);
        colors[status] = interpolateHex(STATUS_START_COLOR, STATUS_END_COLOR, t);
        return colors;
    },
    {} as Record<MaterialOrderStatus, string>,
);

export function materialOrderStatusColor(status?: MaterialOrderStatus | string): string {
    if (status === 'REJECTED') {
        return MATERIAL_ORDER_REJECTED_COLOR;
    }
    if (status && status in STATUS_COLORS) {
        return STATUS_COLORS[status as MaterialOrderStatus];
    }
    return STATUS_START_COLOR;
}
