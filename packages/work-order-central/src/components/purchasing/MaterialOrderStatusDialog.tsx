import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderStatus, MaterialOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { materialOrderManualTransitionTargets } from '../../util/materialOrderStale';

type Props = {
    open: boolean;
    order: MaterialOrderTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function MaterialOrderStatusDialog({ open, order, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const targets = useMemo(
        () => materialOrderManualTransitionTargets(order?.status),
        [order?.status],
    );
    const [pendingStatus, setPendingStatus] = useState<MaterialOrderStatus>('ORDER_SENT');

    useEffect(() => {
        if (!open || !order) return;
        setPendingStatus(targets[0] ?? 'ORDER_SENT');
    }, [open, order?.id, order?.status, targets]);

    const submitStatusTransition = () => {
        const id = order?.id;
        if (id == null || !Number.isFinite(id) || targets.length === 0) return;
        Server.transitionMaterialOrderStatus(
            id,
            pendingStatus,
            () => {
                onSaved();
                onClose();
                toastActionSuccess(t('toastMaterialOrderStatusUpdated'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('materialOrderStatusTransitionTitle')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                    {targets.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {t('materialOrderStatusTransitionUnavailable')}
                        </Typography>
                    ) : (
                        <TextField
                            select
                            label={t('status')}
                            value={pendingStatus}
                            onChange={(e) => setPendingStatus(e.target.value as MaterialOrderStatus)}
                            size="small"
                            fullWidth
                        >
                            {targets.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {t(`materialOrderStatus_${s}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                            variant="contained"
                            onClick={submitStatusTransition}
                            disabled={targets.length === 0}
                        >
                            {t('saveAction')}
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
