import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import {useTranslation} from 'react-i18next';

export type HelpRequestDialogProps = {
    open: boolean;
    details: string;
    submitting: boolean;
    onDetailsChange: (v: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export function HelpRequestDialog({
    open,
    details,
    submitting,
    onDetailsChange,
    onClose,
    onSubmit,
}: HelpRequestDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={() => {}} maxWidth="sm" fullWidth>
            <DialogTitle>{t('helpNeeded')}</DialogTitle>
            <DialogContent>
                <TextField
                    label={t('helpDetails')}
                    value={details}
                    onChange={(e) => onDetailsChange(e.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                    sx={{mt: 1}}
                    disabled={submitting}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    {t('close')}
                </Button>
                <Button onClick={onSubmit} variant="contained" disabled={submitting}>
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
