import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, ConfirmationModal } from 'sf-common';
import type { SampleDataGenerationResultTO, SelectOptionsTO } from 'sf-common/src/models/ApiRequests';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

function optionsToMultiline(opts: string[] | undefined): string {
    return (opts ?? []).join('\n');
}

function multilineToOptions(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

export function MiscManagementPanel() {
    const { t } = useTranslation();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SampleDataGenerationResultTO | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [selectOptionsLoading, setSelectOptionsLoading] = useState(true);
    const [selectOptionsSaving, setSelectOptionsSaving] = useState(false);
    const [measuringToolsText, setMeasuringToolsText] = useState('');
    const [deliveryTermsText, setDeliveryTermsText] = useState('');
    const [selectOptionsError, setSelectOptionsError] = useState<string | null>(null);

    useEffect(() => {
        setSelectOptionsLoading(true);
        setSelectOptionsError(null);
        Server.getSelectOptions(
            (resp: { data?: SelectOptionsTO }) => {
                const d = resp?.data;
                setMeasuringToolsText(optionsToMultiline(d?.measuringTools));
                setDeliveryTermsText(optionsToMultiline(d?.deliveryTerms));
                setSelectOptionsLoading(false);
            },
            () => {
                setSelectOptionsError(t('selectOptionsLoadError'));
                setSelectOptionsLoading(false);
            },
        );
    }, [t]);

    const saveSelectOptions = () => {
        setSelectOptionsSaving(true);
        setSelectOptionsError(null);
        const payload: SelectOptionsTO = {
            measuringTools: multilineToOptions(measuringToolsText),
            deliveryTerms: multilineToOptions(deliveryTermsText),
        };
        Server.saveSelectOptions(
            payload,
            () => {
                setSelectOptionsSaving(false);
                toastActionSuccess(t('selectOptionsSaveSuccess'));
            },
            (err: unknown) => {
                setSelectOptionsSaving(false);
                toastServerError(err, t);
            },
        );
    };

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

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {t('selectOptionsSection')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
                {t('miscSelectOptionsHint')}
            </Typography>
            {selectOptionsError ? (
                <Alert severity="warning" sx={{ mb: 2, maxWidth: 720 }}>
                    {selectOptionsError}
                </Alert>
            ) : null}
            {selectOptionsLoading ? (
                <CircularProgress size={28} sx={{ mb: 2 }} />
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720, mb: 2 }}>
                    <TextField
                        label={t('selectOptionsMeasuringTools')}
                        value={measuringToolsText}
                        onChange={(e) => setMeasuringToolsText(e.target.value)}
                        multiline
                        minRows={5}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('selectOptionsDeliveryTerms')}
                        value={deliveryTermsText}
                        onChange={(e) => setDeliveryTermsText(e.target.value)}
                        multiline
                        minRows={3}
                        size="small"
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={saveSelectOptions}
                        disabled={selectOptionsSaving}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {selectOptionsSaving ? (
                            <CircularProgress size={22} color="inherit" />
                        ) : (
                            t('selectOptionsSave')
                        )}
                    </Button>
                </Box>
            )}

            <Divider sx={{ my: 3, maxWidth: 720 }} />

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {t('generateTestData')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
                {t('miscSampleDataHint')}
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
