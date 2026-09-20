import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderLineTO, MaterialOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server, filterDecimalNumericInput, parseDecimalNumericInputToNumber } from 'sf-common';
import { toastActionError, toastActionSuccess, toastServerError } from '../../util/actionToast';

type Props = {
    open: boolean;
    order: MaterialOrderTO | null;
    onClose: () => void;
    onSaved: () => void;
};

type OfferRow = {
    lineId: number;
    offeredPriceRaw: string;
};

function formatRequestedPrice(value: number | undefined): string {
    if (value == null || !Number.isFinite(value)) return '—';
    return String(value);
}

function defaultOfferedRaw(line: MaterialOrderLineTO): string {
    if (line.offeredPricePerUnit != null && Number.isFinite(line.offeredPricePerUnit)) {
        return String(line.offeredPricePerUnit);
    }
    if (line.pricePerUnit != null && Number.isFinite(line.pricePerUnit)) {
        return String(line.pricePerUnit);
    }
    return '';
}

function lineLabel(line: MaterialOrderLineTO): string {
    return line.materialName?.trim() || line.materialCode?.trim() || (line.materialId != null ? `#${line.materialId}` : '—');
}

export function MaterialOrderAcceptRejectDialog({ open, order, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<OfferRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const lines = useMemo(() => order?.lines ?? [], [order?.lines]);

    useEffect(() => {
        if (!open || !order) return;
        setRows(
            lines
                .filter((line): line is MaterialOrderLineTO & { id: number } => line.id != null && Number.isFinite(line.id))
                .map((line) => ({
                    lineId: line.id,
                    offeredPriceRaw: defaultOfferedRaw(line),
                })),
        );
        setSubmitting(false);
    }, [open, order?.id, lines]);

    const updateOffered = (lineId: number, raw: string) => {
        setRows((prev) =>
            prev.map((row) =>
                row.lineId === lineId ? { ...row, offeredPriceRaw: filterDecimalNumericInput(raw) } : row,
            ),
        );
    };

    const buildAcceptPayload = (): { lines: Array<{ lineId: number; offeredPricePerUnit?: number | null }> } | null => {
        const payloadLines: Array<{ lineId: number; offeredPricePerUnit?: number | null }> = [];
        for (const row of rows) {
            const trimmed = row.offeredPriceRaw.trim();
            if (!trimmed) {
                payloadLines.push({ lineId: row.lineId, offeredPricePerUnit: null });
                continue;
            }
            const parsed = parseDecimalNumericInputToNumber(trimmed);
            if (parsed == null || !Number.isFinite(parsed) || parsed < 0) {
                return null;
            }
            payloadLines.push({ lineId: row.lineId, offeredPricePerUnit: parsed });
        }
        return { lines: payloadLines };
    };

    const handleAccept = () => {
        const id = order?.id;
        if (id == null || !Number.isFinite(id)) return;
        const payload = buildAcceptPayload();
        if (payload == null) {
            toastActionError(t('offeredPricePerUnitInvalid'));
            return;
        }
        setSubmitting(true);
        Server.acceptMaterialOrder(
            id,
            payload,
            () => {
                setSubmitting(false);
                onSaved();
                onClose();
                toastActionSuccess(t('toastMaterialOrderAccepted'));
            },
            (err: unknown) => {
                setSubmitting(false);
                toastServerError(err, t);
            },
        );
    };

    const handleReject = () => {
        const id = order?.id;
        if (id == null || !Number.isFinite(id)) return;
        setSubmitting(true);
        Server.rejectMaterialOrder(
            id,
            () => {
                setSubmitting(false);
                onSaved();
                onClose();
                toastActionSuccess(t('toastMaterialOrderRejected'));
            },
            (err: unknown) => {
                setSubmitting(false);
                const body = (err as { response?: { data?: unknown } })?.response?.data;
                const msg =
                    body === 'MATERIAL_ORDER_HAS_RECEPTION'
                        ? t('materialOrderHasReceptionCannotReject')
                        : body === 'MATERIAL_ORDER_REJECT_NOT_ALLOWED'
                          ? t('materialOrderRejectNotAllowed')
                          : typeof body === 'string'
                            ? body
                            : t('msg_errorRejectingMaterialOrder');
                toastActionError(msg);
            },
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('materialOrderAcceptRejectTitle')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')} disabled={submitting}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {order?.code ? `${order.code} — ` : ''}
                    {order?.materialProviderName?.trim() || '—'}
                </Typography>
                {lines.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {t('materialOrderAcceptRejectNoLines')}
                    </Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('materialName')}</TableCell>
                                <TableCell align="right">{t('quantity')}</TableCell>
                                <TableCell align="right">{t('requestedPricePerUnit')}</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>
                                    {t('offeredPricePerUnit')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line) => {
                                const row = rows.find((r) => r.lineId === line.id);
                                return (
                                    <TableRow key={line.id ?? line.materialId}>
                                        <TableCell>{lineLabel(line)}</TableCell>
                                        <TableCell align="right">{line.quantity ?? 0}</TableCell>
                                        <TableCell align="right">{formatRequestedPrice(line.pricePerUnit)}</TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                size="small"
                                                value={row?.offeredPriceRaw ?? ''}
                                                onChange={(e) => {
                                                    if (line.id == null) return;
                                                    updateOffered(line.id, e.target.value);
                                                }}
                                                disabled={submitting || line.id == null}
                                                inputProps={{ 'aria-label': t('offeredPricePerUnit') }}
                                                fullWidth
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
                    <Button variant="contained" color="success" onClick={handleAccept} disabled={submitting || lines.length === 0}>
                        {t('accept')}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleReject} disabled={submitting}>
                        {t('reject')}
                    </Button>
                    <Button variant="outlined" onClick={onClose} disabled={submitting}>
                        {t('cancel')}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
