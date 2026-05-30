/** Digits only, optional single decimal separator (`,` or `.`). Extra separators stop at the second (no grouping). */
export function filterDecimalNumericInput(input: string): string {
    const cleaned = input.replace(/[^\d.,]/g, '');
    const sepIdx = cleaned.search(/[.,]/);
    if (sepIdx === -1) {
        return cleaned;
    }
    const sep = cleaned[sepIdx]!;
    const before = cleaned.slice(0, sepIdx).replace(/[.,]/g, '');
    let after = cleaned.slice(sepIdx + 1);
    const secondSep = after.search(/[.,]/);
    if (secondSep !== -1) {
        after = after.slice(0, secondSep);
    }
    after = after.replace(/[.,]/g, '');
    return before + sep + after;
}

export function normalizeDecimalCommaToPoint(s: string): string {
    return s.replace(',', '.');
}

export function parseDecimalNumericInputToNumber(raw: string): number | undefined {
    let t = filterDecimalNumericInput(raw).trim();
    if (!/\d/.test(t)) {
        return undefined;
    }
    t = t.replace(/[.,]$/, '');
    t = normalizeDecimalCommaToPoint(t);
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}
