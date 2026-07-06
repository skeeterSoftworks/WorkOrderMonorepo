import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type {
    ProductStockIssueRequestTO,
    ProductStockIssueResultTO,
    ProductStockIssueWorkOrderOptionTO,
} from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { downloadBase64Pdf } from '../../util/downloadBase64Pdf';

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

function workOrderOptionLabel(option: ProductStockIssueWorkOrderOptionTO, t: (key: string) => string): string {
    const wo = option.id != null ? `#${option.id}` : '—';
    const product = option.productReference || option.productName || '—';
    const remaining = option.remainingQuantity ?? 0;
    return t('productStockIssueWorkOrderOptionLabel', {
        workOrder: wo,
        product,
        remaining,
    });
}

type Props = {
    onIssued?: () => void;
};

export function ProductStockIssuePanel({ onIssued }: Props) {
    const { t } = useTranslation();
    const [options, setOptions] = useState<ProductStockIssueWorkOrderOptionTO[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [selected, setSelected] = useState<ProductStockIssueWorkOrderOptionTO | null>(null);
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    const loadOptions = () => {
        setLoadingOptions(true);
        Server.listProductStockIssueWorkOrders(
            (response: { data?: ProductStockIssueWorkOrderOptionTO[] }) => {
                const data = Array.isArray(response?.data) ? response.data : [];
                setOptions(data);
                setLoadingOptions(false);
            },
            () => {
                setOptions([]);
                setLoadingOptions(false);
                setErrorKey('productStockIssueLoadWorkOrdersError');
            },
        );
    };

    useEffect(() => {
        loadOptions();
    }, []);

    useEffect(() => {
        if (!selected) {
            setQuantity('');
            return;
        }
        const remaining = selected.remainingQuantity ?? 0;
        setQuantity(remaining > 0 ? String(remaining) : '');
    }, [selected?.id]);

    const parsedQuantity = useMemo(() => {
        const n = Number(quantity);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }, [quantity]);

    const canSubmit =
        selected?.id != null &&
        parsedQuantity > 0 &&
        parsedQuantity <= (selected.remainingQuantity ?? 0) &&
        parsedQuantity <= (selected.availableStockQuantity ?? 0);

    const handleIssue = () => {
        if (!selected?.id || !canSubmit) return;
        setSubmitting(true);
        setErrorKey(null);
        const payload: ProductStockIssueRequestTO = {
            workOrderId: selected.id,
            quantity: parsedQuantity,
            operatorUserQrCode: readLoggedInUserQr(),
        };
        Server.issueProductStock(
            payload,
            (response: { data?: ProductStockIssueResultTO }) => {
                setSubmitting(false);
                const result = response?.data;
                const pdf = result?.issueReportPdfBase64;
                if (pdf) {
                    const suffix = result?.workOrderId != null ? `wo-${result.workOrderId}` : 'issue';
                    downloadBase64Pdf(pdf, `product-stock-issue-${suffix}.pdf`);
                }
                toast.success(t('productStockIssueSuccess'));
                setSelected(null);
                setQuantity('');
                loadOptions();
                onIssued?.();
            },
            (err: unknown) => {
                setSubmitting(false);
                setErrorKey(resolveErrorKey(err, 'productStockIssueError'));
            },
        );
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
                {t('productStockIssueTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('productStockIssueDescription')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 }}>
                <Autocomplete
                    options={options}
                    value={selected}
                    loading={loadingOptions}
                    onChange={(_, value) => setSelected(value)}
                    getOptionLabel={(option) => workOrderOptionLabel(option, t)}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t('productStockIssueWorkOrder')}
                            size="small"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingOptions ? <CircularProgress size={18} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    noOptionsText={t('productStockIssueNoWorkOrders')}
                />
                {selected && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <TextField
                            type="number"
                            label={t('productStockIssueQuantity')}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            size="small"
                            helperText={t('productStockIssueQuantityHint', {
                                remaining: selected.remainingQuantity ?? 0,
                                available: selected.availableStockQuantity ?? 0,
                            })}
                            inputProps={{ min: 1, max: selected.remainingQuantity ?? undefined }}
                            sx={{ width: 160 }}
                            disabled={submitting}
                        />
                        <TextField
                            label={t('purchaseOrder')}
                            value={selected.purchaseOrderId != null ? `#${selected.purchaseOrderId}` : '—'}
                            size="small"
                            InputProps={{ readOnly: true }}
                            sx={{ width: 140 }}
                        />
                        <TextField
                            label={t('customer')}
                            value={selected.customerName ?? '—'}
                            size="small"
                            InputProps={{ readOnly: true }}
                            sx={{ minWidth: 180, flex: 1 }}
                        />
                    </Box>
                )}
                <Box>
                    <Button
                        variant="contained"
                        onClick={handleIssue}
                        disabled={submitting || !canSubmit}
                    >
                        {submitting ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            t('productStockIssueSubmit')
                        )}
                    </Button>
                </Box>
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
            PRODUCT_STOCK_ISSUE_WORK_ORDER_NOT_FOUND: 'productStockIssueWorkOrderNotFound',
            PRODUCT_STOCK_ISSUE_WORK_ORDER_NOT_COMPLETE: 'productStockIssueWorkOrderNotComplete',
            PRODUCT_STOCK_ISSUE_ALREADY_FULFILLED: 'productStockIssueAlreadyFulfilled',
            PRODUCT_STOCK_ISSUE_EXCEEDS_REMAINING: 'productStockIssueExceedsRemaining',
            PRODUCT_STOCK_ISSUE_INSUFFICIENT_STOCK: 'productStockIssueInsufficientStock',
            CENTRAL_PRODUCT_STOCK_ISSUES_UNAVAILABLE: 'productStockIssueCentralUnavailable',
        };
        return map[data] ?? fallback;
    }
    return fallback;
}
