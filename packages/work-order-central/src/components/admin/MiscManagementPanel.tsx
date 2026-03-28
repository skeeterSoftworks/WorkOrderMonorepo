import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, ConfirmationModal } from 'sf-common';
import type { SampleDataGenerationResultTO } from 'sf-common/src/models/ApiRequests';

export function MiscManagementPanel() {
    const { t } = useTranslation();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SampleDataGenerationResultTO | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const runGenerate = () => {
        setConfirmOpen(false);
        setLoading(true);
        setErrorMessage(null);
        setResult(null);
        Server.generateSampleData(
            (data) => {
                setResult(data);
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                let msg = t('generateSampleDataError');
                if (typeof err === 'object' && err !== null && 'response' in err) {
                    const data = (err as { response?: { data?: unknown } }).response?.data;
                    if (typeof data === 'string' && data.length > 0) msg = data;
                }
                setErrorMessage(msg);
            },
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {t('misc')}
            </Typography>
            <Button
                variant="contained"
                color="warning"
                onClick={() => {
                    setErrorMessage(null);
                    setResult(null);
                    setConfirmOpen(true);
                }}
                disabled={loading}
            >
                {loading ? <CircularProgress size={22} color="inherit" /> : t('generateTestData')}
            </Button>
            {errorMessage ? (
                <Alert severity="error" sx={{ mt: 2, maxWidth: 640 }}>
                    {errorMessage}
                </Alert>
            ) : null}
            {result ? (
                <Alert severity="success" sx={{ mt: 2, maxWidth: 640 }}>
                    {t('generateSampleDataSuccess', {
                        machines: result.machinesInserted,
                        tools: result.toolsInserted,
                        products: result.productsInserted,
                        customers: result.customersInserted,
                        users: result.usersInserted,
                    })}
                </Alert>
            ) : null}
            <ConfirmationModal
                open={confirmOpen}
                modalMessage={t('generateSampleDataConfirm')}
                onModalClose={() => !loading && setConfirmOpen(false)}
                onConfirm={() => {
                    runGenerate();
                }}
            />
        </Box>
    );
}
