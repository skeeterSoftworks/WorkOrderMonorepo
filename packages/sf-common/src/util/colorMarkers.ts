/** Optional visual markers for material reception batches (e.g. same SKU, different providers). */
export const COLOR_MARKER_VALUES = [
    'RED',
    'ORANGE',
    'YELLOW',
    'GREEN',
    'BLUE',
    'PURPLE',
    'PINK',
    'BROWN',
    'GRAY',
    'BLACK',
] as const;

export type ColorMarkerValue = (typeof COLOR_MARKER_VALUES)[number];

export const COLOR_MARKER_SWATCHES: Record<ColorMarkerValue, string> = {
    RED: '#E53935',
    ORANGE: '#FB8C00',
    YELLOW: '#FDD835',
    GREEN: '#43A047',
    BLUE: '#1E88E5',
    PURPLE: '#8E24AA',
    PINK: '#D81B60',
    BROWN: '#6D4C41',
    GRAY: '#757575',
    BLACK: '#212121',
};

export function isColorMarkerValue(value: string | null | undefined): value is ColorMarkerValue {
    return value != null && (COLOR_MARKER_VALUES as readonly string[]).includes(value);
}

export function colorMarkerSwatch(value: string | null | undefined): string | null {
    if (!isColorMarkerValue(value)) return null;
    return COLOR_MARKER_SWATCHES[value];
}
