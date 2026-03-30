import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {useTranslation} from 'react-i18next';
import type {WorkStationPreconditionItem} from '../models/ApiRequests';

function preconditionText(item: WorkStationPreconditionItem, lang: 'sr' | 'en'): string {
    if (lang === 'sr') {
        return (item.sr || item.en || '').trim();
    }
    return (item.en || item.sr || '').trim();
}

export type WorkStationPreconditionsDialogProps = {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    fetchErrorKey: string | null;
    items: WorkStationPreconditionItem[];
    lang: 'sr' | 'en';
};

export function WorkStationPreconditionsDialog({
    open,
    onClose,
    loading,
    fetchErrorKey,
    items,
    lang,
}: WorkStationPreconditionsDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1}}>
                {t('workStationPreconditionsTitle')}
                <IconButton aria-label={t('close')} onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 3}}>
                        <CircularProgress size={36} />
                    </Box>
                )}
                {!loading && fetchErrorKey && (
                    <Typography color="error" variant="body2">
                        {t(fetchErrorKey)}
                    </Typography>
                )}
                {!loading && !fetchErrorKey && (
                    <List dense disablePadding>
                        {items.map((item, index) => {
                            const text = preconditionText(item, lang);
                            if (!text) return null;
                            return (
                                <ListItem
                                    key={index}
                                    secondaryAction={<CheckCircleIcon color="success" fontSize="small" aria-hidden />}
                                    sx={{'& .MuiListItemSecondaryAction-root': {right: 8}}}
                                >
                                    <ListItemText primary={text} primaryTypographyProps={{variant: 'body2'}} />
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{px: 3, pb: 2}}>
                <Button variant="outlined" color="primary" onClick={onClose}>
                    {t('close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
