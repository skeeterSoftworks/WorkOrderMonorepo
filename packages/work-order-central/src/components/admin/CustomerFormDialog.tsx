import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { CustomerTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

type Props = {
    open: boolean;
    customer: CustomerTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function CustomerFormDialog({ open, customer, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [companyName, setCompanyName] = useState('');
    const [addressData, setAddressData] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (!open) return;
        setCompanyName(customer?.companyName ?? '');
        setAddressData(customer?.addressData ?? '');
        setDescription(customer?.description ?? '');
    }, [open, customer?.id]);

    const handleSubmit = () => {
        const payload: CustomerTO = {
            id: customer?.id,
            companyName: companyName || undefined,
            addressData: addressData || undefined,
            description: description || undefined,
        };
        const onSuccess = () => {
            onSaved();
            onClose();
            toastActionSuccess(customer?.id ? t('toastCustomerUpdated') : t('toastCustomerAdded'));
        };
        if (customer?.id) {
            Server.editCustomer(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addCustomer(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {customer?.id ? t('editCustomer') : t('addCustomer')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box component="form" autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField label={t('companyName')} value={companyName} onChange={(e) => setCompanyName(e.target.value)} size="small" fullWidth />
                    <TextField label={t('addressData')} value={addressData} onChange={(e) => setAddressData(e.target.value)} size="small" fullWidth multiline minRows={2} />
                    <TextField label={t('description')} value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth multiline minRows={2} />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {customer?.id ? t('editCustomer') : t('addCustomer')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
