import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import {useTranslation} from 'react-i18next';

export type ProductionTargetReachedDialogProps = {
    open: boolean;
    /** End the still-open session and clear local selection. */
    onCloseSession: () => void | Promise<void>;
    /** Dismiss modal and continue this work session (surplus -> stock is TBD). */
    onContinue: () => void | Promise<void>;
};

/**
 * Shown when the work order reaches required quantity (work order closes automatically).
 */
export function ProductionTargetReachedDialog({open, onCloseSession, onContinue}: ProductionTargetReachedDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog
            open={open}
            disableEscapeKeyDown
            onClose={(_, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    return;
                }
            }}
        >
            <DialogTitle>{t('workOrderCompleteTargetDialogTitle')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{mt: 0.5}}>
                    <Alert severity="info" variant="outlined">
                        <Typography variant="body2" component="span">
                            {t('workOrderCompleteTargetDialogBodyWorkOrderClosed')}
                        </Typography>
                    </Alert>
                    <Alert severity="info" variant="outlined">
                        <Typography variant="body2" component="span">
                            {t('workOrderCompleteTargetDialogBodySessionClosed')}
                        </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        {t('workOrderCompleteTargetDialogSurplusStockTbd')}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions sx={{px: 3, pb: 2, flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end'}}>
                <Button variant="outlined" color="inherit" onClick={() => void onCloseSession()}>
                    {t('workOrderCompleteTargetDialogCloseSession')}
                </Button>
                <Button variant="contained" color="primary" onClick={() => void onContinue()}>
                    {t('workOrderCompleteTargetDialogContinue')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
