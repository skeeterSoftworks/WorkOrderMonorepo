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
import { toastActionError, toastActionSuccess, toastServerError } from '../../util/actionToast';

type Props = {
    open: boolean;
    customer: CustomerTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function CustomerFormDialog({ open, customer, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [companyName, setCompanyName] = useState('');
    const [buyerId, setBuyerId] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [addressData, setAddressData] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (!open) return;
        setCompanyName(customer?.companyName ?? '');
        setBuyerId(customer?.buyerId ?? '');
        setContactPerson(customer?.contactPerson ?? '');
        setEmailAddress(customer?.emailAddress ?? '');
        setPhoneNumber(customer?.phoneNumber ?? '');
        setAddressData(customer?.addressData ?? '');
        setDescription(customer?.description ?? '');
    }, [open, customer?.id]);

    const isFormValid =
        Boolean(companyName.trim()) &&
        Boolean(contactPerson.trim()) &&
        Boolean(emailAddress.trim()) &&
        Boolean(phoneNumber.trim());

    const handleSubmit = () => {
        if (!isFormValid) {
            toastActionError(t('customerContactFieldsRequired'));
            return;
        }
        const payload: CustomerTO = {
            id: customer?.id,
            companyName: companyName.trim(),
            buyerId: buyerId.trim() || undefined,
            contactPerson: contactPerson.trim(),
            emailAddress: emailAddress.trim(),
            phoneNumber: phoneNumber.trim(),
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
                    <TextField
                        required
                        label={t('companyName')}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('customerBuyerId')}
                        value={buyerId}
                        onChange={(e) => setBuyerId(e.target.value)}
                        size="small"
                        fullWidth
                        helperText={t('customerBuyerIdHint')}
                    />
                    <TextField
                        required
                        label={t('customerContactPerson')}
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        required
                        label={t('customerEmailAddress')}
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        size="small"
                        fullWidth
                        type="email"
                        inputMode="email"
                    />
                    <TextField
                        required
                        label={t('customerPhoneNumber')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        size="small"
                        fullWidth
                        inputMode="tel"
                    />
                    <TextField
                        label={t('addressData')}
                        value={addressData}
                        onChange={(e) => setAddressData(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                    />
                    <TextField
                        label={t('description')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={!isFormValid}>
                            {customer?.id ? t('editCustomer') : t('addCustomer')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
