import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import CloseIcon from '@mui/icons-material/Close';
import type { MaterialProviderTO, MaterialTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { useTranslation } from 'react-i18next';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { filterDecimalNumericInput, parseDecimalNumericInputToNumber } from 'sf-common/src/util/DataUtils';

const MATERIAL_CATALOG_STORAGE_KEY = 'workOrderCentral.materialCatalog';

function providerKey(p: MaterialProviderTO): string {
    if (p.id != null) return `id:${p.id}`;
    return `name:${(p.name ?? '').trim().toLowerCase()}`;
}

function materialProvidersOf(m: MaterialTO): MaterialProviderTO[] {
    if (Array.isArray(m.providers)) return m.providers;
    return m.provider ? [m.provider] : [];
}

function loadMaterialCatalog(): MaterialTO[] {
    try {
        const raw = localStorage.getItem(MATERIAL_CATALOG_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveMaterialCatalog(list: MaterialTO[]) {
    localStorage.setItem(MATERIAL_CATALOG_STORAGE_KEY, JSON.stringify(list));
}

export function MaterialProvidersManagementPanel() {
    const { t } = useTranslation();
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [providers, setProviders] = useState<MaterialProviderTO[]>([]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<MaterialProviderTO | null>(null);
    const [providerName, setProviderName] = useState('');
    const [providerContactPerson, setProviderContactPerson] = useState('');
    const [providerEmailAddress, setProviderEmailAddress] = useState('');
    const [providerPhoneNumber, setProviderPhoneNumber] = useState('');
    const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
    const [materialsCatalog, setMaterialsCatalog] = useState<MaterialTO[]>([]);
    const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
    const [materialName, setMaterialName] = useState('');
    const [materialCode, setMaterialCode] = useState('');
    const [materialProductsPerUnit, setMaterialProductsPerUnit] = useState('');
    const [materialDiameter, setMaterialDiameter] = useState('');
    const [materialWeight, setMaterialWeight] = useState('');
    const [materialLength, setMaterialLength] = useState('');
    const [materialWidth, setMaterialWidth] = useState('');
    const [materialProviderKeysSelected, setMaterialProviderKeysSelected] = useState<string[]>([]);

    const sortedProviders = useMemo(
        () => [...providers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        [providers],
    );

    const loadProducts = () => {
        Server.getAllProducts(
            (response: unknown) => {
                const r = response as { data?: ProductTO[] | { data?: ProductTO[] } };
                const data = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
                setProducts(data);
            },
            () => {},
        );
    };

    const loadProviders = () => {
        Server.getAllMaterialProviders(
            (response: unknown) => {
                const r = response as { data?: MaterialProviderTO[] | { data?: MaterialProviderTO[] } };
                const data = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
                setProviders(data);
            },
            () => {},
        );
    };

    useEffect(() => {
        setMaterialsCatalog(loadMaterialCatalog());
        loadProviders();
        loadProducts();
    }, []);

    const resetForm = () => {
        setEditingKey(null);
        setProviderName('');
        setProviderContactPerson('');
        setProviderEmailAddress('');
        setProviderPhoneNumber('');
    };

    const isFormValid =
        Boolean(providerName.trim()) &&
        Boolean(providerContactPerson.trim()) &&
        Boolean(providerEmailAddress.trim()) &&
        Boolean(providerPhoneNumber.trim());

    const saveAllUpdatedProducts = (items: ProductTO[], onSuccess: () => void) => {
        const changed = items.filter((p, i) =>
            JSON.stringify(p.materials ?? []) !== JSON.stringify(products[i]?.materials ?? []) ||
            JSON.stringify(p.materialProviderIds ?? []) !== JSON.stringify(products[i]?.materialProviderIds ?? []),
        );
        if (changed.length === 0) {
            onSuccess();
            return;
        }
        let remaining = changed.length;
        for (const payload of changed) {
            Server.editProduct(
                payload,
                () => {
                    remaining -= 1;
                    if (remaining === 0) onSuccess();
                },
                (err: unknown) => toastServerError(err, t),
            );
        }
    };

    const addOrUpdateProvider = () => {
        if (!isFormValid) return;
        const newProvider: MaterialProviderTO = {
            id: editingKey
                ? providers.find((p) => providerKey(p) === editingKey)?.id
                : undefined,
            name: providerName.trim(),
            contactPerson: providerContactPerson.trim(),
            emailAddress: providerEmailAddress.trim(),
            phoneNumber: providerPhoneNumber.trim(),
            grade: editingKey ? providers.find((p) => providerKey(p) === editingKey)?.grade ?? 0 : 0,
        };

        if (!editingKey) {
            Server.addMaterialProvider(
                newProvider,
                () => {
                    loadProviders();
                    toastActionSuccess(t('toastMaterialProviderSaved'));
                    resetForm();
                },
                (err: unknown) => toastServerError(err, t),
            );
            return;
        }

        const updated = products.map((product) => ({
            ...product,
            materials: (product.materials ?? []).map((m) => {
                const providers = materialProvidersOf(m).map((x) =>
                    providerKey(x) === editingKey ? { ...newProvider } : x,
                );
                return { ...m, providers, provider: undefined };
            }),
        }));

        saveAllUpdatedProducts(updated, () => {
            Server.editMaterialProvider(
                newProvider,
                () => {
                    loadProviders();
                    loadProducts();
                    toastActionSuccess(t('toastMaterialProviderSaved'));
                    resetForm();
                },
                (err: unknown) => toastServerError(err, t),
            );
        });
    };

    const editProvider = (p: MaterialProviderTO) => {
        setEditingKey(providerKey(p));
        setProviderName(p.name ?? '');
        setProviderContactPerson(p.contactPerson ?? '');
        setProviderEmailAddress(p.emailAddress ?? '');
        setProviderPhoneNumber(p.phoneNumber ?? '');
    };

    const confirmDeleteProvider = () => {
        if (!providerToDelete) return;
        const key = providerKey(providerToDelete);
        const updated = products.map((product) => ({
            ...product,
            materials: (product.materials ?? []).map((m) =>
                ({
                    ...m,
                    providers: materialProvidersOf(m).filter((x) => providerKey(x) !== key),
                    provider: undefined,
                }),
            ),
        }));
        saveAllUpdatedProducts(updated, () => {
            if (!providerToDelete?.id) return;
            Server.deleteMaterialProvider(
                providerToDelete.id,
                () => {
                    setProviderToDelete(null);
                    loadProviders();
                    loadProducts();
                    toastActionSuccess(t('toastMaterialProviderDeleted'));
                    if (editingKey === key) resetForm();
                },
                (err: unknown) => toastServerError(err, t),
            );
        });
    };

    const resetMaterialForm = () => {
        setEditingMaterialIndex(null);
        setMaterialName('');
        setMaterialCode('');
        setMaterialProductsPerUnit('');
        setMaterialDiameter('');
        setMaterialWeight('');
        setMaterialLength('');
        setMaterialWidth('');
        setMaterialProviderKeysSelected([]);
    };

    const openMaterialsDialog = () => {
        setMaterialsCatalog(loadMaterialCatalog());
        resetMaterialForm();
        setMaterialsDialogOpen(true);
    };

    const addOrUpdateMaterial = () => {
        if (!materialName.trim() || !materialCode.trim() || !materialProductsPerUnit.trim() || materialProviderKeysSelected.length === 0) {
            return;
        }
        const selectedProviders = materialProviderKeysSelected
            .map((k) => providers.find((p) => providerKey(p) === k))
            .filter((p): p is MaterialProviderTO => Boolean(p))
            .map((p) => ({ ...p }));
        const parsedPpu = Number(materialProductsPerUnit);
        const row: MaterialTO = {
            id: editingMaterialIndex !== null ? materialsCatalog[editingMaterialIndex]?.id : undefined,
            name: materialName.trim(),
            code: materialCode.trim(),
            productsPerUnit: Number.isFinite(parsedPpu) ? Math.trunc(parsedPpu) : undefined,
            diameter: parseDecimalNumericInputToNumber(materialDiameter),
            weight: parseDecimalNumericInputToNumber(materialWeight),
            length: parseDecimalNumericInputToNumber(materialLength),
            width: parseDecimalNumericInputToNumber(materialWidth),
            providers: selectedProviders,
            provider: undefined,
        };
        const next = [...materialsCatalog];
        if (editingMaterialIndex !== null) next[editingMaterialIndex] = row;
        else next.push(row);
        setMaterialsCatalog(next);
        saveMaterialCatalog(next);
        resetMaterialForm();
    };

    const beginEditMaterial = (idx: number) => {
        const row = materialsCatalog[idx];
        if (!row) return;
        setEditingMaterialIndex(idx);
        setMaterialName(row.name ?? '');
        setMaterialCode(row.code ?? '');
        setMaterialProductsPerUnit(row.productsPerUnit != null ? String(row.productsPerUnit) : '');
        setMaterialDiameter(row.diameter != null ? String(row.diameter) : '');
        setMaterialWeight(row.weight != null ? String(row.weight) : '');
        setMaterialLength(row.length != null ? String(row.length) : '');
        setMaterialWidth(row.width != null ? String(row.width) : '');
        setMaterialProviderKeysSelected(materialProvidersOf(row).map((p) => providerKey(p)));
    };

    const removeMaterial = (idx: number) => {
        const next = materialsCatalog.filter((_, i) => i !== idx);
        setMaterialsCatalog(next);
        saveMaterialCatalog(next);
        if (editingMaterialIndex === idx) resetMaterialForm();
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('materialProvidersManagement')}</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={resetForm}>
                    {t('addProvider')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <TextField required label={t('materialProviderName')} value={providerName} onChange={(e) => setProviderName(e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                        <TextField required label={t('materialProviderContact')} value={providerContactPerson} onChange={(e) => setProviderContactPerson(e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                        <TextField required label={t('materialProviderEmail')} value={providerEmailAddress} onChange={(e) => setProviderEmailAddress(e.target.value)} size="small" sx={{ flex: '1 1 220px' }} />
                        <TextField required label={t('materialProviderPhone')} value={providerPhoneNumber} onChange={(e) => setProviderPhoneNumber(e.target.value)} size="small" sx={{ flex: '1 1 160px' }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" onClick={addOrUpdateProvider} disabled={!isFormValid}>
                            {editingKey ? t('updateProvider') : t('addProvider')}
                        </Button>
                        {editingKey && (
                            <Button variant="outlined" onClick={resetForm}>
                                {t('cancel')}
                            </Button>
                        )}
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('materialProviderName')}</TableCell>
                                <TableCell>{t('materialProviderContact')}</TableCell>
                                <TableCell>{t('materialProviderEmail')}</TableCell>
                                <TableCell>{t('materialProviderPhone')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedProviders.length > 0 ? sortedProviders.map((p) => (
                                <TableRow key={providerKey(p)}>
                                    <TableCell>{p.name ?? '—'}</TableCell>
                                    <TableCell>{p.contactPerson ?? '—'}</TableCell>
                                    <TableCell>{p.emailAddress ?? '—'}</TableCell>
                                    <TableCell>{p.phoneNumber ?? '—'}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => editProvider(p)} title={t('edit')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={openMaterialsDialog} title={t('materialsEditTooltip')}>
                                                <Typography component="span" sx={{ fontSize: '0.95rem', fontWeight: 800, color: 'secondary.main', lineHeight: 1 }}>
                                                    M
                                                </Typography>
                                            </IconButton>
                                            <IconButton size="small" sx={tableActionIconButtonSx.delete} onClick={() => setProviderToDelete(p)} title={t('remove')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary">{t('noMaterialProviders')}</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal
                open={!!providerToDelete}
                modalMessage={t('confirmDeleteMaterialProvider')}
                onConfirm={confirmDeleteProvider}
                onModalClose={() => setProviderToDelete(null)}
            />

            <Dialog open={materialsDialogOpen} onClose={() => setMaterialsDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {t('materialsEditorTitle')}
                    <IconButton size="small" onClick={() => setMaterialsDialogOpen(false)} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <TextField required label={t('materialName')} value={materialName} onChange={(e) => setMaterialName(e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                            <TextField required label={t('materialCode')} value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} size="small" sx={{ flex: '1 1 160px' }} />
                            <TextField required label={t('materialProductsPerUnit')} value={materialProductsPerUnit} onChange={(e) => setMaterialProductsPerUnit(e.target.value.replace(/[^\d]/g, ''))} size="small" sx={{ width: 180 }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <TextField label={t('diameterMeasurement')} value={materialDiameter} onChange={(e) => setMaterialDiameter(filterDecimalNumericInput(e.target.value))} size="small" sx={{ width: 130 }} />
                            <TextField label={t('weight')} value={materialWeight} onChange={(e) => setMaterialWeight(filterDecimalNumericInput(e.target.value))} size="small" sx={{ width: 130 }} />
                            <TextField label={t('length')} value={materialLength} onChange={(e) => setMaterialLength(filterDecimalNumericInput(e.target.value))} size="small" sx={{ width: 130 }} />
                            <TextField label={t('width')} value={materialWidth} onChange={(e) => setMaterialWidth(filterDecimalNumericInput(e.target.value))} size="small" sx={{ width: 130 }} />
                        </Box>
                        <TextField
                            select
                            required
                            label={t('materialProviderName')}
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) =>
                                    (selected as string[])
                                        .map((key) => providers.find((p) => providerKey(p) === key)?.name ?? key)
                                        .join(', '),
                            }}
                            value={materialProviderKeysSelected}
                            onChange={(e) => {
                                const v = e.target.value;
                                setMaterialProviderKeysSelected(Array.isArray(v) ? v.map(String) : [String(v)]);
                            }}
                            size="small"
                        >
                            {sortedProviders.map((p) => (
                                <MenuItem key={providerKey(p)} value={providerKey(p)}>
                                    {p.name || p.contactPerson || t('none')}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="contained" onClick={addOrUpdateMaterial}>
                                {editingMaterialIndex !== null ? t('updateMaterial') : t('addMaterial')}
                            </Button>
                            {editingMaterialIndex !== null && (
                                <Button variant="outlined" onClick={resetMaterialForm}>
                                    {t('cancel')}
                                </Button>
                            )}
                        </Box>

                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('materialName')}</TableCell>
                                    <TableCell>{t('materialCode')}</TableCell>
                                    <TableCell>{t('materialProviderName')}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materialsCatalog.length > 0 ? materialsCatalog.map((m, idx) => (
                                    <TableRow key={m.id ?? `${m.code}-${idx}`}>
                                        <TableCell>{m.name ?? '—'}</TableCell>
                                        <TableCell>{m.code ?? '—'}</TableCell>
                                        <TableCell>{materialProvidersOf(m).map((p) => p.name || p.contactPerson).filter(Boolean).join(', ') || '—'}</TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => beginEditMaterial(idx)} title={t('edit')}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" sx={tableActionIconButtonSx.delete} onClick={() => removeMaterial(idx)} title={t('remove')}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableActionsRow>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <Typography variant="body2" color="text.secondary">{t('materialsEmpty')}</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
