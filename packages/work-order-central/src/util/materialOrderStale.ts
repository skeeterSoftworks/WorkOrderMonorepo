import type { MaterialOrderStatus, MaterialOrderTO } from 'sf-common/src/models/ApiRequests';

/** Matches {@link com.skeeterSoftworks.WorkOrderCentral.service.MaterialOrderService#STALE_LAST_CHANGE_DAYS}. */
export const MATERIAL_ORDER_STALE_LAST_CHANGE_DAYS = 3;

export const MATERIAL_ORDER_STALE_MONITOR_EXCLUDED_STATUSES: MaterialOrderStatus[] = [
    'RECEIVED_IN_STOCK',
    'VALIDATED',
];

export const MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES: MaterialOrderStatus[] = [
    'ORDER_SENT',
    'ORDER_ACKNOWLEDGED',
    'ORDER_ACCEPTED',
    'IN_TRANSPORT',
];

export function isMaterialOrderStaleForMonitoring(o: MaterialOrderTO): boolean {
    if (!o.status || MATERIAL_ORDER_STALE_MONITOR_EXCLUDED_STATUSES.includes(o.status)) return false;
    if (!o.lastChanged) return true;
    const ms = new Date(o.lastChanged).getTime();
    if (!Number.isFinite(ms)) return true;
    const threshold = Date.now() - MATERIAL_ORDER_STALE_LAST_CHANGE_DAYS * 24 * 60 * 60 * 1000;
    return ms < threshold;
}
