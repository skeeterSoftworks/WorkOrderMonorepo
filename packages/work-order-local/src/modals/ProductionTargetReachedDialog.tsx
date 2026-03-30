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

export function ProductionTargetReachedDialog({open, onAcknowledge}: ProductionTargetReachedDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={() => void onAcknowledge()}>
            <DialogTitle>{t('workOrderProductionTargetReachedTitle')}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{mt: 1}}>
                    {t('workOrderProductionTargetReachedBody')}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => void onAcknowledge()} variant="contained">
                    {t('close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
