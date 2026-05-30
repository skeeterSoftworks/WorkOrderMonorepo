import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';

export type RecordGoodProductsDialogProps = {
    open: boolean;
    onClose: () => void;
    submitting: boolean;
    goodDelta: string;
    onGoodDeltaChange: (v: string) => void;
    onSave: () => void;
};

export function RecordGoodProductsDialog({
    open,
    onClose,
    submitting,
    goodDelta,
    onGoodDeltaChange,
    onSave,
}: RecordGoodProductsDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('workSessionRecordGood')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{mt: 1}}>
                    <TextField
                        label={t('workSessionGoodCountDelta')}
                        type="number"
                        inputProps={{min: 1, step: 1}}
                        value={goodDelta}
                        onChange={(e) => onGoodDeltaChange(e.target.value)}
                        fullWidth
                        required
                    />
                    <Typography variant="caption" color="text.secondary">
                        {t('workSessionGoodFlushHint')}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={onSave} variant="contained" disabled={submitting}>
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
