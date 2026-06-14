import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { ApplicationUserTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

type Props = {
    open: boolean;
    user: ApplicationUserTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function UserFormDialog({ open, user, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? '');
        setSurname(user?.surname ?? '');
        setQrCode(user?.qrCode ?? '');
        setRole(user?.role ?? 'OPERATOR');
    }, [open, user?.id]);

    const handleSubmit = () => {
        const payload: ApplicationUserTO = { id: user?.id, name, surname, qrCode, role };
        const onSuccess = () => {
            onSaved();
            onClose();
            toastActionSuccess(user?.id ? t('toastUserUpdated') : t('toastUserAdded'));
        };
        if (user?.id) {
            Server.editUser(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addUser(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {user?.id ? t('editUser') : t('addUser')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box component="form" autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField label={t('name')} value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth />
                    <TextField label={t('surname')} value={surname} onChange={(e) => setSurname(e.target.value)} size="small" fullWidth />
                    <TextField label={t('qrCode')} value={qrCode} onChange={(e) => setQrCode(e.target.value)} size="small" fullWidth />
                    <TextField select label={t('role')} value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OPERATOR')} size="small" fullWidth>
                        <MenuItem value="OPERATOR">{t('operator')}</MenuItem>
                        <MenuItem value="ADMIN">{t('admin')}</MenuItem>
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {user?.id ? t('editUser') : t('addUser')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
