import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import {useTranslation} from 'react-i18next';

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
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('workSessionDeclareFaulty')}</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{mt: 1}}>
                    <TextField
                        label={t('reason')}
                        value={faultyReason}
                        onChange={(e) => onFaultyReasonChange(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        select
                        label={t('workSessionRejectCause')}
                        value={faultyCause}
                        onChange={(e) => onFaultyCauseChange(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value="">{t('none')}</MenuItem>
                        {(() => {
                            const opts = [...rejectCauseOptions];
                            if (faultyCause && !opts.includes(faultyCause)) {
                                opts.push(faultyCause);
                            }
                            return opts.map((cause) => (
                                <MenuItem key={cause} value={cause}>
                                    {cause}
                                </MenuItem>
                            ));
                        })()}
                    </TextField>
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
                <Button onClick={onSave} variant="contained" disabled={submitting}>
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
