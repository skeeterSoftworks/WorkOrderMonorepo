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
import type { MaterialOrderStatus, MaterialOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES } from '../../util/materialOrderStale';

type Props = {
    open: boolean;
    order: MaterialOrderTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function MaterialOrderStatusDialog({ open, order, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [pendingStatus, setPendingStatus] = useState<MaterialOrderStatus>('ORDER_SENT');

    useEffect(() => {
        if (!open || !order) return;
        const initial =
            order.status && MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES.includes(order.status)
                ? order.status
                : 'ORDER_SENT';
        setPendingStatus(initial);
    }, [open, order?.id, order?.status]);

    const submitStatusTransition = () => {
        const id = order?.id;
        if (id == null || !Number.isFinite(id)) return;
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
                    <TextField
                        select
                        label={t('status')}
                        value={pendingStatus}
                        onChange={(e) => setPendingStatus(e.target.value as MaterialOrderStatus)}
                        size="small"
                        fullWidth
                    >
                        {MATERIAL_ORDER_MANUAL_TRANSITION_STATUSES.map((s) => (
                            <MenuItem key={s} value={s}>
                                {t(`materialOrderStatus_${s}`)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" onClick={submitStatusTransition}>
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
