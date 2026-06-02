import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { isPdfDataUrl, normalizeBinaryDataUrl } from 'sf-common/src/util/mediaDataUrl';

type Props = {
    open: boolean;
    title: string;
    certificateUrl?: string;
    loading?: boolean;
    loadError?: boolean;
    onClose: () => void;
};

export function MaterialOrderCertificateViewDialog({
    open,
    title,
    certificateUrl,
    loading = false,
    loadError = false,
    onClose,
}: Props) {
    const { t } = useTranslation();
    const displayUrl = certificateUrl ? normalizeBinaryDataUrl(certificateUrl) : undefined;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {title}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ minHeight: 200 }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}
                {!loading && loadError && (
                    <Typography color="error">{t('materialOrderCertificateLoadError')}</Typography>
                )}
                {!loading && !loadError && displayUrl && isPdfDataUrl(displayUrl) && (
                    <Box
                        component="iframe"
                        title={t('certificate')}
                        src={displayUrl}
                        sx={{
                            width: '100%',
                            minHeight: 480,
                            border: 'none',
                            borderRadius: 1,
                        }}
                    />
                )}
                {!loading && !loadError && displayUrl && !isPdfDataUrl(displayUrl) && (
                    <Box
                        component="img"
                        alt={t('certificate')}
                        src={displayUrl}
                        sx={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            margin: '0 auto',
                            objectFit: 'contain',
                        }}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
