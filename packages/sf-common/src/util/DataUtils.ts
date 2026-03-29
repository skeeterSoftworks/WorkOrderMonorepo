export const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays: any[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}

export function getDigitNormalized(inputValue: string): string {

    if (!inputValue) {
        return ""
    }

    return inputValue.replace(",", ".").replace(/[^0-9.+/-]+/g, "");
}

/** Digits only, optional single decimal separator (`,` or `.`). Extra separators or grouping stop at the second. */
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

/** Serbian decimal comma → dot for parsing (at most one comma after filtering). */
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

export function createTableData(label: string, value?: string | number,) {
    return { label, value };
}

export function replaceCommaWithNewLine(inputString: string | undefined): string{
    if (!inputString){
        return ""
    } else {
        return  inputString.replace(/,/g, '\n');
    }
}
