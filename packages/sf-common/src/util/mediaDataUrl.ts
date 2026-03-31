/**
 * Normalize a technical-drawing / quality-step payload for use in the browser.
 * Supports full `data:*;base64,...` URLs (e.g. from FileReader) and raw base64 from APIs.
 */
export function normalizeBinaryDataUrl(
    raw: string | undefined,
    legacyFallbackMime: 'image/jpeg' | 'image/png' = 'image/jpeg',
): string | undefined {
    const t = raw?.trim();
    if (!t) return undefined;
    if (t.startsWith('data:')) return t;
    if (t.startsWith('JVBERi')) return `data:application/pdf;base64,${t}`;
    if (t.startsWith('iVBORw')) return `data:image/png;base64,${t}`;
    if (t.startsWith('/9j/')) return `data:image/jpeg;base64,${t}`;
    return `data:${legacyFallbackMime};base64,${t}`;
}

export function isPdfDataUrl(url: string): boolean {
    return /^data:application\/pdf/i.test(url) || /^data:application\/x-pdf/i.test(url);
}
