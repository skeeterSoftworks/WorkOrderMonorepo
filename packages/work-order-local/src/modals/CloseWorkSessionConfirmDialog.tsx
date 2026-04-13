import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';

export type CloseWorkSessionConfirmDialogProps = {
    open: boolean;
    submitting: boolean;
    sessionStartedAtText: string;
    sessionDurationText: string;
    goodProductsCount: number;
    faultyProductsCount: number;
    setupProductsCount: number;
    onConfirmClose: () => void | Promise<void>;
    onContinueSession: () => void;
};

/** Confirmation dialog shown before ending an active production work session. */
export function CloseWorkSessionConfirmDialog({
    open,
    submitting,
    sessionStartedAtText,
    sessionDurationText,
    goodProductsCount,
    faultyProductsCount,
    setupProductsCount,
    onConfirmClose,
    onContinueSession,
}: CloseWorkSessionConfirmDialogProps) {
    const {t} = useTranslation();

    return (
        <Dialog
            open={open}
            onClose={(_, reason) => {
                if (submitting) return;
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    onContinueSession();
                }
            }}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>{t('workSessionCloseDialogTitle')}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={1.25}>
                    <Typography variant="body2" color="text.secondary">
                        {t('workSessionCloseDialogDescription')}
                    </Typography>
                    <Typography variant="body2">
                        {t('workSessionCloseStartedAt')}: {sessionStartedAtText}
                    </Typography>
                    <Typography variant="body2">
                        {t('workSessionCloseDuration')}: {sessionDurationText}
                    </Typography>
                    <Typography variant="body2">
                        {t('productionWorkSessionGoodRecorded')}: {goodProductsCount}
                    </Typography>
                    <Typography variant="body2">
                        {t('productionWorkSessionFaultyCount')}: {faultyProductsCount}
                    </Typography>
                    <Typography variant="body2">
                        {t('productionWorkSessionSetupCount')}: {setupProductsCount}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions sx={{px: 3, py: 2, gap: 1}}>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onContinueSession}
                    disabled={submitting}
                >
                    {t('workSessionCloseReturnToSession')}
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => void onConfirmClose()}
                    disabled={submitting}
                >
                    {t('workSessionCloseConfirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
