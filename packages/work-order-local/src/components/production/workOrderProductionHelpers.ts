import type {ProductionWorkOrderTO} from '../../models/ApiRequests.ts';

export function isWorkOrderClosedForProduction(wo: ProductionWorkOrderTO): boolean {
    if (wo.state === 'COMPLETE') return true;
    const req = wo.requiredQuantity ?? 0;
    const prod = wo.producedGoodQuantity ?? 0;
    return req > 0 && prod >= req;
}
