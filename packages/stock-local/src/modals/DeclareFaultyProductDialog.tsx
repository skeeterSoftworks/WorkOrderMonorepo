import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import {useTranslation} from 'react-i18next';
import {faultyProductDialogTitleSx} from './workSessionDialogStyles';

export type DeclareFaultyProductDialogProps = {
    open: boolean;
    onClose: () => void;
    submitting: boolean;
    rejectCauseOptions: string[];
    faultyReason: string;
    onFaultyReasonChange: (v: string) => void;
    faultyCause: string;
    onFaultyCauseChange: (v: string) => void;
    faultyComment: string;
    onFaultyCommentChange: (v: string) => void;
    onSave: () => void;
};

export function DeclareFaultyProductDialog({
    open,
    onClose,
    submitting,
    rejectCauseOptions,
    faultyReason,
    onFaultyReasonChange,
    faultyCause,
    onFaultyCauseChange,
    faultyComment,
    onFaultyCommentChange,
    onSave,
}: DeclareFaultyProductDialogProps) {
    const {t} = useTranslation();
    const causeSuggestions = [...rejectCauseOptions];
    if (faultyCause.trim() && !causeSuggestions.includes(faultyCause.trim())) {
        causeSuggestions.push(faultyCause.trim());
    }
    const reasonMissing = faultyReason.trim().length === 0;
    const causeMissing = faultyCause.trim().length === 0;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={faultyProductDialogTitleSx}>{t('workSessionDeclareFaulty')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{mt: 1}}>
                    <TextField
                        required
                        label={t('reason')}
                        value={faultyReason}
                        onChange={(e) => onFaultyReasonChange(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        required
                        label={t('workSessionRejectCause')}
                        value={faultyCause}
                        onChange={(e) => onFaultyCauseChange(e.target.value)}
                        fullWidth
                        inputProps={{list: 'faulty-cause-suggestions'}}
                    />
                    <datalist id="faulty-cause-suggestions">
                        {causeSuggestions.map((cause) => (
                            <option key={cause} value={cause} />
                        ))}
                    </datalist>
                    <TextField
                        label={t('comment')}
                        value={faultyComment}
                        onChange={(e) => onFaultyCommentChange(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button
                    onClick={onSave}
                    variant="contained"
                    disabled={submitting || reasonMissing || causeMissing}
                >
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
