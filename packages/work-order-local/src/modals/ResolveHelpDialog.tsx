import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';

export type ResolveHelpDialogProps = {
    open: boolean;
    adminQr: string;
    submitting: boolean;
    onAdminQrChange: (v: string) => void;
    onClose: () => void;
    onResolve: () => void;
};

export function ResolveHelpDialog({
    open,
    adminQr,
    submitting,
    onAdminQrChange,
    onClose,
    onResolve,
}: ResolveHelpDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={() => {}} maxWidth="sm" fullWidth>
            <DialogTitle>{t('resolveHelp')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{mt: 1}}>
                    <Typography variant="body2" color="text.secondary">
                        {t('helpResolveAdminAuthPrompt')}
                    </Typography>
                    <TextField
                        label={t('enterOrScanQR')}
                        value={adminQr}
                        onChange={(e) => onAdminQrChange(e.target.value)}
                        fullWidth
                        autoFocus
                        disabled={submitting}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    {t('close')}
                </Button>
                <Button onClick={onResolve} variant="contained" disabled={submitting}>
                    {t('resolveHelp')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
