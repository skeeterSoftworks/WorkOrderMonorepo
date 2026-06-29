import type { MaterialOrderLineTO, MaterialOrderReceptionTO, MaterialOrderTO, ProductMaterialUnitOfMeasure } from 'sf-common/src/models/ApiRequests';
import { PRODUCT_MATERIAL_UNITS_OF_MEASURE } from 'sf-common/src/models/ApiRequests';

const DEFAULT_UNIT: ProductMaterialUnitOfMeasure = 'PCS';

export function materialUnitOfMeasureLabel(
    unit: ProductMaterialUnitOfMeasure | undefined,
    t: (key: string) => string,
): string {
    if (unit && (PRODUCT_MATERIAL_UNITS_OF_MEASURE as readonly string[]).includes(unit)) {
        return t(`unitOfMeasure_${unit}`);
    }
    return t(`unitOfMeasure_${DEFAULT_UNIT}`);
}

export function lineUnitOfMeasure(
    line: Pick<MaterialOrderLineTO, 'materialUnitOfMeasure'> | undefined,
    order?: Pick<MaterialOrderTO, 'materialUnitOfMeasure'>,
): ProductMaterialUnitOfMeasure | undefined {
    return line?.materialUnitOfMeasure ?? order?.materialUnitOfMeasure;
}

export function receptionUnitOfMeasure(
    reception: Pick<MaterialOrderReceptionTO, 'materialUnitOfMeasure'>,
): ProductMaterialUnitOfMeasure | undefined {
    return reception.materialUnitOfMeasure;
}

export function formatQuantityWithUnit(
    quantity: string | number,
    unit: ProductMaterialUnitOfMeasure | undefined,
    t: (key: string) => string,
): string {
    return `${quantity} ${materialUnitOfMeasureLabel(unit, t)}`;
}
