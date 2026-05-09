import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { useTranslation } from 'react-i18next';
import { Server } from 'sf-common';
import type { MaterialOrderTO, MaterialProviderTO, MaterialTO } from 'sf-common/src/models/ApiRequests';
import { toastActionError, toastActionSuccess, toastServerError } from '../../util/actionToast';

export function PurchasingPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<MaterialOrderTO[]>([]);
    const [materials, setMaterials] = useState<MaterialTO[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const [quantity, setQuantity] = useState('');
    const [materialId, setMaterialId] = useState<number | undefined>(undefined);
    const [materialProviderId, setMaterialProviderId] = useState<number | undefined>(undefined);

    const selectedMaterial = useMemo(
        () => materials.find((m) => m.id === materialId),
        [materials, materialId],
    );

    const providerOptions = useMemo<MaterialProviderTO[]>(
        () => (selectedMaterial?.providers ?? []).filter((p): p is MaterialProviderTO => p.id != null),
        [selectedMaterial],
    );

    const canCreate =
        materialId != null &&
        materialProviderId != null &&
        Number(quantity) > 0 &&
        Number.isFinite(Number(quantity));

    useEffect(() => {
        loadOrders();
        loadMaterials();
    }, []);

    const loadOrders = () => {
        Server.getAllMaterialOrders(
            (response: any) => {
                let data: MaterialOrderTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setOrders(data);
            },
            () => {},
        );
    };

    const loadMaterials = () => {
        Server.getAllMaterials(
            (response: any) => {
                let data: MaterialTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMaterials(data);
            },
            () => {},
        );
    };

    const resetCreateForm = () => {
        setQuantity('');
        setMaterialId(undefined);
        setMaterialProviderId(undefined);
    };

    const openCreateDialog = () => {
        resetCreateForm();
        setCreateOpen(true);
    };

    const closeCreateDialog = () => {
        setCreateOpen(false);
    };

    const findProviderForOrder = (order: MaterialOrderTO): MaterialProviderTO | undefined => {
        if (order.materialId == null || order.materialProviderId == null) return undefined;
        const material = materials.find((m) => m.id === order.materialId);
        return material?.providers?.find((p) => p.id === order.materialProviderId);
    };

    const openEmailDraft = (order: MaterialOrderTO, provider?: MaterialProviderTO) => {
        const email = provider?.emailAddress?.trim();
        if (!email) {
            toastActionError(t('materialProviderEmailMissing'));
            return;
        }
        const materialLabel = order.materialName || order.materialCode || t('materialName');
        const qty = order.quantity ?? 0;
        const providerLabel = provider?.name || provider?.contactPerson || '—';
        const subject = `${t('materialOrderEmailSubjectPrefix')} ${materialLabel}`;
        const body = [
            `${t('materialOrderEmailGreeting')} ${providerLabel},`,
            '',
            `${t('materialOrderEmailBodyLineMaterial')}: ${materialLabel}`,
            `${t('materialOrderEmailBodyLineQuantity')}: ${qty}`,
            `${t('materialOrderEmailBodyLineProvider')}: ${providerLabel}`,
            '',
            t('materialOrderEmailClosing'),
        ].join('\n');
        const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
    };

    const handleCreate = () => {
        if (!canCreate) return;
        const payload = {
            quantity: Math.trunc(Number(quantity)),
            materialId,
            materialProviderId,
        };
        Server.addMaterialOrder(
            payload,
            (response: any) => {
                let saved: MaterialOrderTO | undefined;
                if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                    saved = response.data as MaterialOrderTO;
                }
                loadOrders();
                closeCreateDialog();
                toastActionSuccess(t('toastMaterialOrderAdded'));
                const effectiveOrder: MaterialOrderTO = saved ?? {
                    ...payload,
                    materialName: selectedMaterial?.name,
                    materialCode: selectedMaterial?.code,
                };
                const provider = providerOptions.find((p) => p.id === materialProviderId);
                openEmailDraft(effectiveOrder, provider);
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{t('purchasing')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                    {t('createMaterialOrder')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('materialName')}</TableCell>
                                <TableCell>{t('materialProviderName')}</TableCell>
                                <TableCell>{t('quantity')}</TableCell>
                                <TableCell>{t('status')}</TableCell>
                                <TableCell>{t('certificate')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map((o) => (
                                    <TableRow key={o.id ?? `${o.materialId}-${o.materialProviderId}-${o.quantity}`}>
                                        <TableCell>{o.materialName || o.materialCode || '—'}</TableCell>
                                        <TableCell>{o.materialProviderName || '—'}</TableCell>
                                        <TableCell>{o.quantity ?? 0}</TableCell>
                                        <TableCell>{o.status ? t(`materialOrderStatus_${o.status}`) : '—'}</TableCell>
                                        <TableCell>{o.certificatePresent ? t('yes') : t('no')}</TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                title={t('emailMaterialOrder')}
                                                onClick={() => openEmailDraft(o, findProviderForOrder(o))}
                                            >
                                                <EmailOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('noMaterialOrders')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={createOpen} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('createMaterialOrder')}
                    <IconButton size="small" onClick={closeCreateDialog} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                        <TextField
                            select
                            label={t('materialName')}
                            value={materialId ?? ''}
                            onChange={(e) => {
                                const nextMaterialId = e.target.value ? Number(e.target.value) : undefined;
                                setMaterialId(nextMaterialId);
                                setMaterialProviderId(undefined);
                            }}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {materials.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.name || m.code || m.id}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label={t('materialProviderName')}
                            value={materialProviderId ?? ''}
                            onChange={(e) =>
                                setMaterialProviderId(e.target.value ? Number(e.target.value) : undefined)
                            }
                            size="small"
                            fullWidth
                            disabled={materialId == null}
                            helperText={materialId == null ? t('selectMaterialFirst') : undefined}
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {providerOptions.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.name || p.contactPerson || p.id}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            type="number"
                            label={t('quantity')}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            size="small"
                            fullWidth
                            inputProps={{ min: 1, step: 1 }}
                        />

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button variant="contained" onClick={handleCreate} disabled={!canCreate}>
                                {t('saveAction')}
                            </Button>
                            <Button variant="outlined" onClick={closeCreateDialog}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
