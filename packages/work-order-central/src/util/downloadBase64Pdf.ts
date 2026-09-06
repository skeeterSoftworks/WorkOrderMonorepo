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
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
        // Popup blocked — fall back to download-style navigation.
        window.location.href = url;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
