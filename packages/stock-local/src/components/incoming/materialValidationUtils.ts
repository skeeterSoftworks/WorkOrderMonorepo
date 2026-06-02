import type {
    MaterialOrderReceptionInternalControlTO,
    MaterialOrderReceptionTO,
    MaterialOrderTO,
} from 'sf-common/src/models/ApiRequests';

export type MaterialDimensionKey = 'diameter' | 'length' | 'width' | 'weight';

const DIMENSION_VALUE_GETTERS: Record<
    MaterialDimensionKey,
    (source: MaterialOrderReceptionTO | MaterialOrderTO) => number | undefined
> = {
    diameter: (s) => s.materialDiameter,
    length: (s) => s.materialLength,
    width: (s) => s.materialWidth,
    weight: (s) => s.materialWeight,
};

export function isMaterialDimensionDefined(value?: number): boolean {
    return value != null && Number.isFinite(value) && value !== 0;
}

export function getDefinedMaterialDimensions(
    source: MaterialOrderReceptionTO | MaterialOrderTO,
): MaterialDimensionKey[] {
    return (Object.keys(DIMENSION_VALUE_GETTERS) as MaterialDimensionKey[]).filter((key) =>
        isMaterialDimensionDefined(DIMENSION_VALUE_GETTERS[key](source)),
    );
}

export function getNominalDimensionValue(
    source: MaterialOrderReceptionTO | MaterialOrderTO,
    key: MaterialDimensionKey,
): number | undefined {
    const value = DIMENSION_VALUE_GETTERS[key](source);
    return isMaterialDimensionDefined(value) ? value : undefined;
}

export type SampleInputs = Record<MaterialDimensionKey, [string, string, string]>;

export function emptySampleInputs(): SampleInputs {
    return {
        diameter: ['', '', ''],
        length: ['', '', ''],
        width: ['', '', ''],
        weight: ['', '', ''],
    };
}

export function sampleInputsFromInternalControl(
    ic: MaterialOrderReceptionInternalControlTO | undefined,
): SampleInputs {
    const next = emptySampleInputs();
    const fill = (key: MaterialDimensionKey, values?: number[]) => {
        if (!values?.length) return;
        next[key] = [
            values[0] != null ? String(values[0]) : '',
            values[1] != null ? String(values[1]) : '',
            values[2] != null ? String(values[2]) : '',
        ];
    };
    fill('diameter', ic?.diameterSamples);
    fill('length', ic?.lengthSamples);
    fill('width', ic?.widthSamples);
    fill('weight', ic?.weightSamples);
    return next;
}

export type InternalControlSubmitData = {
    samples: SampleInputs;
    overallWeight: string;
    overallAcceptance: boolean;
};

export function parseOverallWeight(raw: string): number | undefined {
    const n = Number.parseFloat(raw.trim());
    return Number.isFinite(n) ? n : undefined;
}

export function isOverallWeightValid(raw: string): boolean {
    return parseOverallWeight(raw) != null;
}

export function overallFieldsFromInternalControl(ic: MaterialOrderReceptionInternalControlTO | undefined): {
    overallWeight: string;
    overallAcceptance: boolean | null;
} {
    return {
        overallWeight: ic?.overallWeight != null ? String(ic.overallWeight) : '',
        overallAcceptance: ic?.overallAcceptance ?? null,
    };
}

export function buildInternalControlPayload(
    source: MaterialOrderReceptionTO | MaterialOrderTO,
    form: InternalControlSubmitData,
): MaterialOrderReceptionInternalControlTO {
    const payload: MaterialOrderReceptionInternalControlTO = {
        overallWeight: parseOverallWeight(form.overallWeight),
        overallAcceptance: form.overallAcceptance,
    };
    for (const key of getDefinedMaterialDimensions(source)) {
        const parsed = form.samples[key].map((raw) => Number.parseFloat(raw.trim()));
        if (key === 'diameter') payload.diameterSamples = parsed;
        if (key === 'length') payload.lengthSamples = parsed;
        if (key === 'width') payload.widthSamples = parsed;
        if (key === 'weight') payload.weightSamples = parsed;
    }
    return payload;
}

export function areRequiredSamplesComplete(
    source: MaterialOrderReceptionTO | MaterialOrderTO,
    samples: SampleInputs,
): boolean {
    for (const key of getDefinedMaterialDimensions(source)) {
        for (const raw of samples[key]) {
            const n = Number.parseFloat(raw.trim());
            if (!Number.isFinite(n)) return false;
        }
    }
    return true;
}

export function isInternalControlFormComplete(
    source: MaterialOrderReceptionTO | MaterialOrderTO,
    samples: SampleInputs,
    overallWeight: string,
    overallAcceptance: boolean | null,
): boolean {
    if (!isOverallWeightValid(overallWeight)) return false;
    if (overallAcceptance === null) return false;
    const dimensions = getDefinedMaterialDimensions(source);
    if (dimensions.length > 0 && !areRequiredSamplesComplete(source, samples)) return false;
    return true;
}

export function orderToReceptionContext(order: MaterialOrderTO, receptionId: number): MaterialOrderReceptionTO {
    return {
        id: receptionId,
        materialOrderId: order.id,
        materialOrderCode: order.code,
        materialCode: order.materialCode,
        materialName: order.materialName,
        materialProviderName: order.materialProviderName,
        materialDiameter: order.materialDiameter,
        materialWeight: order.materialWeight,
        materialLength: order.materialLength,
        materialWidth: order.materialWidth,
    };
}
