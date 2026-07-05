import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import {
    APPLICATION_ROLES,
    normalizeUserRoles,
    type ApplicationRole,
} from 'sf-common/src/auth/applicationRoles';
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
    const [roles, setRoles] = useState<ApplicationRole[]>(['OPERATOR']);

    useEffect(() => {
        if (!open) return;
        setName(user?.name ?? '');
        setSurname(user?.surname ?? '');
        setQrCode(user?.qrCode ?? '');
        const existing = normalizeUserRoles(user ?? undefined);
        setRoles(existing.length > 0 ? existing : ['OPERATOR']);
    }, [open, user?.id]);

    const toggleRole = (role: ApplicationRole) => {
        setRoles((prev) =>
            prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
        );
    };

    const handleSubmit = () => {
        if (roles.length === 0) {
            return;
        }
        const payload: ApplicationUserTO = { id: user?.id, name, surname, qrCode, roles };
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

                    <Typography variant="subtitle2">{t('roles')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('applicationRoleLegendIntro')}
                    </Typography>
                    <FormGroup>
                        {APPLICATION_ROLES.map((role) => (
                            <Tooltip
                                key={role}
                                title={t(`applicationRoleDescription_${role}`)}
                                placement="right"
                                arrow
                            >
                                <FormControlLabel
                                    sx={{ width: 'fit-content' }}
                                    control={
                                        <Checkbox
                                            checked={roles.includes(role)}
                                            onChange={() => toggleRole(role)}
                                        />
                                    }
                                    label={t(`applicationRole_${role}`)}
                                />
                            </Tooltip>
                        ))}
                    </FormGroup>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={roles.length === 0}>
                            {user?.id ? t('editUser') : t('addUser')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
