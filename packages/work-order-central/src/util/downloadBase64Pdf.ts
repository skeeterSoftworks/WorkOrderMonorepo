import { b64toBlob } from 'sf-common/src/util/DataUtils';

export function downloadBase64Pdf(base64: string, filename: string): void {
    const blob = b64toBlob(base64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

/** Opens a Base64 PDF in a new browser tab (for print/preview). */
export function openBase64PdfInNewTab(base64: string): void {
    const blob = b64toBlob(base64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    // Avoid fallback navigation of the current tab: window.open(..., 'noopener') often returns null
    // even when the new tab opened successfully.
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
