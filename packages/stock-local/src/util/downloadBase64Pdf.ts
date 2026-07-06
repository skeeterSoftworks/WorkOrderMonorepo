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
