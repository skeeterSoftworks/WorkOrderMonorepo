import type { CustomerTO } from 'sf-common/src/models/ApiRequests';

/** Serbian canonical name; must match WorkOrderCentral {@code InternalStockOrdererConstants.COMPANY_NAME}. */
export const INTERNAL_STOCK_ORDERER_COMPANY_NAME = 'Interni radni nalog (za magacin)';

const LEGACY_INTERNAL_STOCK_ORDERER_EN = 'Internal Work Order (for Stock)';

export function isInternalStockOrdererCustomer(customer: CustomerTO | undefined | null): boolean {
    const n = (customer?.companyName ?? '').trim();
    return n === INTERNAL_STOCK_ORDERER_COMPANY_NAME || n === LEGACY_INTERNAL_STOCK_ORDERER_EN;
}
