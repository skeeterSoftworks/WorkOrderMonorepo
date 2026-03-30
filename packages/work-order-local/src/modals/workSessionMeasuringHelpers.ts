import {parseDecimalNumericInputToNumber} from '../util/decimalNumericInput';

/** Parsed measured value vs prototype absolute [minTolerance, maxTolerance]; no icon if bounds missing or input incomplete. */
export function measuredValueToleranceHint(
    assessedRaw: string,
    minTol: number | undefined | null,
    maxTol: number | undefined | null,
): 'in' | 'out' | 'none' {
    const parsed = parseDecimalNumericInputToNumber(assessedRaw);
    if (parsed === undefined) {
        return 'none';
    }
    if (minTol == null || maxTol == null) {
        return 'none';
    }
    if (!Number.isFinite(minTol) || !Number.isFinite(maxTol) || minTol > maxTol) {
        return 'none';
    }
    if (parsed >= minTol && parsed <= maxTol) {
        return 'in';
    }
    return 'out';
}

export function assessedMeasuredValueForApi(raw: string | undefined): string | undefined {
    const n = parseDecimalNumericInputToNumber(raw ?? '');
    return n === undefined ? undefined : String(n);
}
