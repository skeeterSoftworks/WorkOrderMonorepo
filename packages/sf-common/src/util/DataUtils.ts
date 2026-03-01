export const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
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
