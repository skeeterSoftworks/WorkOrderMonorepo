/** British locale yields EU-style order: dd/mm/yy with slashes. */
const EU_DISPLAY_LOCALE = 'en-GB';

export function formatEuropeanDate(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleDateString(EU_DISPLAY_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });
}

export function formatEuropeanDateTime(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString(EU_DISPLAY_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function localDateTime2String(localDate: number[]): string {

    if (!localDate || localDate.length < 7) {
        return "/"
    }

    const year: string = localDate[0] ? localDate[0].toString() : "";
    const month: string = localDate[1] ? localDate[1].toString() : "";
    const day: string = localDate[2] ? localDate[2].toString() : "";
    const hour: string = localDate[3] !== undefined ? twoDigitPadding(localDate[3].toString()) : "";
    const minute: string = localDate[4] !== undefined ? twoDigitPadding(localDate[4].toString()) : "";
    const second: string = localDate[5] !== undefined ? twoDigitPadding(localDate[5].toString()) : "";


    return `${day}.${month}.${year} ${hour}:${minute}:${second}`
}

export function twoDigitPadding(inputVal: string): string {

    if (inputVal === undefined) {
        return ""
    }

    if (inputVal.length === 1) {
        return "0" + inputVal;
    } else {
        return inputVal
    }

}
