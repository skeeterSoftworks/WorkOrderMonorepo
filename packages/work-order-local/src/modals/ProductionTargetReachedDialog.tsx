import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';

export type ProductionTargetReachedDialogProps = {
    open: boolean;
    onAcknowledge: () => void;
};

/**
 * Shown when the work order reaches ordered quantity (session may be auto-closed on central),
 * or when a late good-delta hits {@code WORK_SESSION_ALREADY_ENDED}.
 */
export function ProductionTargetReachedDialog({open, onAcknowledge}: ProductionTargetReachedDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={() => void onAcknowledge()}>
            <DialogTitle>{t('workOrderCompleteStockpilingTitle')}</DialogTitle>
            <DialogContent>
                <Alert severity="info" variant="outlined" sx={{mt: 0.5}}>
                    <Typography variant="body2">{t('workOrderCompleteStockpilingBody')}</Typography>
                </Alert>
            </DialogContent>
            <DialogActions sx={{px: 3, pb: 2, flexWrap: 'wrap', gap: 1}}>
                <Button onClick={() => void onAcknowledge()} color="inherit">
                    {t('workOrderStockpilingClose')}
                </Button>
                <Button variant="contained" onClick={() => void onAcknowledge()}>
                    {t('workOrderStockpilingContinue')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
