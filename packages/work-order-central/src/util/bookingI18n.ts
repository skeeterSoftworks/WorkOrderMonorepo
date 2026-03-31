/** i18n key for machine booking `type`, or empty if unknown. */
export function bookingTypeTranslationKey(type: string | undefined): string {
    switch (type) {
        case 'PRODUCTION':
            return 'bookingTypeProduction';
        case 'MAINTENANCE':
            return 'bookingTypeMaintenance';
        case 'SETUP':
            return 'bookingTypeSetup';
        case 'OTHER':
            return 'bookingTypeOther';
        default:
            return '';
    }
}

/** i18n key for machine booking `status`, or empty if unknown. */
export function bookingStatusTranslationKey(status: string | undefined): string {
    switch (status) {
        case 'PLANNED':
            return 'bookingStatusPlanned';
        case 'CONFIRMED':
            return 'bookingStatusConfirmed';
        case 'COMPLETED':
            return 'bookingStatusCompleted';
        case 'CANCELLED':
            return 'bookingStatusCancelled';
        default:
            return '';
    }
}
