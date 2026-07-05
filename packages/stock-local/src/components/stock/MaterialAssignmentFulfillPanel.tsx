import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { FulfillStockAssignmentOrderRequestTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';

function readLoggedInUserQr(): string | undefined {
    const raw = sessionStorage.getItem('userData');
    if (!raw) return undefined;
    try {
        const user = JSON.parse(raw) as { qrCode?: string };
        const qr = user.qrCode?.trim();
        return qr || undefined;
    } catch {
        return undefined;
    }
}

function normalizeCodeInput(raw: string): string {
    return raw.replace(/\s+/g, '').slice(0, 8);
}

type Props = {
    onFulfilled?: () => void;
};

export function MaterialAssignmentFulfillPanel({ onFulfilled }: Props) {
    const { t } = useTranslation();
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    const handleIssue = () => {
        const normalized = normalizeCodeInput(code);
        if (!/^\d{8}$/.test(normalized)) {
            setErrorKey('materialAssignmentOrderInvalidCode');
            return;
        }
        setSubmitting(true);
        setErrorKey(null);
        const payload: FulfillStockAssignmentOrderRequestTO = {
            code: normalized,
            operatorUserQrCode: readLoggedInUserQr(),
        };
        Server.fulfillMaterialAssignmentOrder(
            payload,
            () => {
                setSubmitting(false);
                setCode('');
                toast.success(t('materialAssignmentOrderFulfillSuccess'));
                onFulfilled?.();
            },
            (err: unknown) => {
                setSubmitting(false);
                setErrorKey(resolveErrorKey(err, 'materialAssignmentOrderFulfillError'));
            },
        );
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
                {t('materialAssignmentFulfillTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('materialAssignmentFulfillDescription')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                    label={t('materialAssignmentOrderCode')}
                    value={code}
                    onChange={(e) => {
                        setCode(normalizeCodeInput(e.target.value));
                        if (errorKey) setErrorKey(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleIssue();
                        }
                    }}
                    size="small"
                    disabled={submitting}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                    sx={{ minWidth: 180 }}
                />
                <Button
                    variant="contained"
                    onClick={handleIssue}
                    disabled={submitting || code.length < 8}
                >
                    {submitting ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        t('materialAssignmentOrderIssue')
                    )}
                </Button>
            </Box>

            {errorKey && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {t(errorKey)}
                </Alert>
            )}
        </Paper>
    );
}

function resolveErrorKey(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (typeof data === 'string') {
        const map: Record<string, string> = {
            MATERIAL_ASSIGNMENT_ORDER_NOT_FOUND: 'materialAssignmentOrderNotFound',
            MATERIAL_ASSIGNMENT_ORDER_INVALID_CODE: 'materialAssignmentOrderInvalidCode',
            MATERIAL_ASSIGNMENT_ORDER_ALREADY_ASSIGNED: 'materialAssignmentOrderAlreadyAssigned',
            MATERIAL_ASSIGNMENT_ORDER_INSUFFICIENT_STOCK: 'materialAssignmentOrderInsufficientStock',
            CENTRAL_MATERIAL_ASSIGNMENT_ORDERS_UNAVAILABLE: 'materialAssignmentOrderCentralUnavailable',
        };
        return map[data] ?? fallback;
    }
    return fallback;
}
