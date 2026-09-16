import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { CustomerTO } from 'sf-common/src/models/ApiRequests';

type Props = {
    open: boolean;
    customer: CustomerTO | null;
    onClose: () => void;
};

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', py: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                {label}
            </Typography>
            <Typography variant="body2" component="div" sx={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                {value}
            </Typography>
        </Box>
    );
}

function displayValue(value: string | number | null | undefined): string {
    if (value == null) return '—';
    const text = String(value).trim();
    return text || '—';
}

export function CustomerInfoDialog({ open, customer, onClose }: Props) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('customerInfo')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {customer && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5 }}>
                        <DetailField label={t('companyName')} value={displayValue(customer.companyName)} />
                        <DetailField label={t('customerBuyerId')} value={displayValue(customer.buyerId)} />
                        <DetailField label={t('customerContactPerson')} value={displayValue(customer.contactPerson)} />
                        <DetailField label={t('customerEmailAddress')} value={displayValue(customer.emailAddress)} />
                        <DetailField label={t('customerPhoneNumber')} value={displayValue(customer.phoneNumber)} />
                        <DetailField label={t('addressData')} value={displayValue(customer.addressData)} />
                        <DetailField label={t('description')} value={displayValue(customer.description)} />
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
