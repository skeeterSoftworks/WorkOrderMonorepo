import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { LicenseActivationInfoTO } from '../../models/ApiRequests';
import { Server } from '../../api/Server';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

export function LicenseActivationPanel() {
    const { t } = useTranslation();
    const [info, setInfo] = useState<LicenseActivationInfoTO | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Server.getLicenseActivationInfo(
            (data) => {
                setInfo(data);
                setLoading(false);
            },
            (err) => {
                toastServerError(err, t);
                setLoading(false);
            }
        );
    }, [t]);

    const copyMacs = () => {
        const text = (info?.macAddresses ?? []).join('\n');
        if (!text) return;
        void navigator.clipboard.writeText(text).then(() => {
            toastActionSuccess(t('toastMacCopied'));
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!info) {
        return <Typography color="error">{t('licenseActivationLoadError')}</Typography>;
    }

    const macs = info.macAddresses ?? [];
    const macBlock = (
        <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t('licenseMacAddresses')}</Typography>
            <Box
                component="pre"
                sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}
            >
                {macs.length ? macs.join('\n') : '—'}
            </Box>
            <Button variant="outlined" onClick={copyMacs} disabled={!macs.length}>
                {t('licenseCopyMac')}
            </Button>
        </Stack>
    );

    if (info.scenario === 'ERROR') {
        return (
            <Box sx={{ py: 2 }}>
                <Typography color="error">
                    {t('licenseActivationError', { message: info.errorMessage ?? t('toastActionErrorFallback') })}
                </Typography>
                {macBlock}
            </Box>
        );
    }

    if (info.scenario === 'NONE') {
        return (
            <Box sx={{ py: 2 }}>
                <Typography variant="body1" paragraph>
                    {t('licenseNotActivated')}
                </Typography>
                {macBlock}
            </Box>
        );
    }

    if (info.scenario === 'TIME_LIMITED') {
        const expired = info.timeLimitedExpired === true;
        const date = info.validUntil ?? '';
        return (
            <Box sx={{ py: 2 }}>
                <Typography variant="body1" paragraph>
                    {expired
                        ? t('licenseTimeLimitedExpired', { date })
                        : t('licenseTimeLimitedActive', { date })}
                </Typography>
                {macBlock}
            </Box>
        );
    }

    if (info.scenario === 'PERPETUAL') {
        return (
            <Box sx={{ py: 2 }}>
                <Typography variant="body1" paragraph>
                    {t('licensePerpetualActive')}
                </Typography>
                {info.issuedTo && (
                    <Typography variant="body1">
                        <strong>{t('licenseIssuedTo')}:</strong> {info.issuedTo}
                    </Typography>
                )}
            </Box>
        );
    }

    return <Typography color="text.secondary">{t('licenseActivationLoadError')}</Typography>;
}
