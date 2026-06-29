import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { alpha, type Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { MaterialProviderTO, MaterialTO, ProductMaterialUnitOfMeasure } from 'sf-common/src/models/ApiRequests';
import { PRODUCT_MATERIAL_UNITS_OF_MEASURE } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { MaterialCatalogTable } from './MaterialCatalogTable';

const DEFAULT_UNIT_OF_MEASURE: ProductMaterialUnitOfMeasure = 'PCS';

function normalizeUnitOfMeasure(value: unknown): ProductMaterialUnitOfMeasure {
    if (typeof value === 'string' && (PRODUCT_MATERIAL_UNITS_OF_MEASURE as readonly string[]).includes(value)) {
        return value as ProductMaterialUnitOfMeasure;
    }
    return DEFAULT_UNIT_OF_MEASURE;
}

const multiSelectMenuItemSx = (theme: Theme) => ({
    py: 1,
    '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.26),
        fontWeight: 600,
        borderLeft: `3px solid ${theme.palette.primary.main}`,
    },
    '&.Mui-selected.Mui-focusVisible': {
        backgroundColor: alpha(theme.palette.primary.main, 0.32),
    },
    '&.Mui-selected:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.36),
    },
});

function providerKey(p: MaterialProviderTO): string {
    if (p.id != null) return `id:${p.id}`;
    return `name:${(p.name ?? '').trim().toLowerCase()}`;
}

function materialProvidersOf(m: MaterialTO): MaterialProviderTO[] {
    if (Array.isArray(m.providers)) return m.providers;
    return m.provider ? [m.provider] : [];
}

type Props = {
    open: boolean;
    provider: MaterialProviderTO | null;
    providers: MaterialProviderTO[];
    materialsCatalog: MaterialTO[];
    onClose: () => void;
    onCatalogRefresh: () => void;
};

export function MaterialsCatalogDialog({
    open,
    provider,
    providers,
    materialsCatalog,
    onClose,
    onCatalogRefresh,
}: Props) {
    const { t } = useTranslation();
    const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
    const [materialName, setMaterialName] = useState('');
    const [materialCode, setMaterialCode] = useState('');
    const [materialUnitOfMeasure, setMaterialUnitOfMeasure] = useState<ProductMaterialUnitOfMeasure>(DEFAULT_UNIT_OF_MEASURE);
    const [materialProviderKeysSelected, setMaterialProviderKeysSelected] = useState<string[]>([]);

    const sortedProviders = useMemo(
        () => [...providers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        [providers],
    );

    const dialogMaterials = useMemo(() => {
        const rows = materialsCatalog.map((m, idx) => ({ m, idx }));
        if (!provider) return rows;
        const key = providerKey(provider);
        return rows.filter(({ m }) =>
            materialProvidersOf(m).some((p) => providerKey(p) === key),
        );
    }, [materialsCatalog, provider]);

    const resetMaterialForm = useCallback(
        (options?: { preserveActiveProvider?: boolean }) => {
            setEditingMaterialIndex(null);
            setMaterialName('');
            setMaterialCode('');
            setMaterialUnitOfMeasure(DEFAULT_UNIT_OF_MEASURE);
            if (options?.preserveActiveProvider && provider) {
                setMaterialProviderKeysSelected([providerKey(provider)]);
            } else {
                setMaterialProviderKeysSelected([]);
            }
        },
        [provider],
    );

    const renderProviderValue = useCallback(
        (selected: unknown) => (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {(selected as string[]).map((key) => {
                    const matchedProvider = providers.find((p) => providerKey(p) === key);
                    const isActive = !!provider && providerKey(provider) === key;
                    return (
                        <Chip
                            key={key}
                            size="small"
                            label={
                                isActive
                                    ? `${matchedProvider?.name ?? key} (${t('activeProvider')})`
                                    : (matchedProvider?.name ?? key)
                            }
                            color={isActive ? 'primary' : 'default'}
                            variant="outlined"
                        />
                    );
                })}
            </Stack>
        ),
        [provider, providers, t],
    );

    const addOrUpdateMaterial = () => {
        if (!materialName.trim() || !materialCode.trim() || materialProviderKeysSelected.length === 0) {
            return;
        }
        const selectedProviders = materialProviderKeysSelected
            .map((k) => providers.find((p) => providerKey(p) === k))
            .filter((p): p is MaterialProviderTO => Boolean(p))
            .map((p) => ({ ...p }));
        const row: MaterialTO = {
            id: editingMaterialIndex !== null ? materialsCatalog[editingMaterialIndex]?.id : undefined,
            name: materialName.trim(),
            code: materialCode.trim(),
            unitOfMeasure: materialUnitOfMeasure,
            providers: selectedProviders,
            provider: undefined,
        };
        Server.saveMaterial(
            row,
            () => {
                onCatalogRefresh();
                resetMaterialForm({ preserveActiveProvider: true });
                toastActionSuccess(t('toastMaterialSaved'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const beginEditMaterial = (idx: number) => {
        const row = materialsCatalog[idx];
        if (!row) return;
        setEditingMaterialIndex(idx);
        setMaterialName(row.name ?? '');
        setMaterialCode(row.code ?? '');
        setMaterialUnitOfMeasure(normalizeUnitOfMeasure(row.unitOfMeasure));
        setMaterialProviderKeysSelected(materialProvidersOf(row).map((p) => providerKey(p)));
    };

    const removeMaterial = (idx: number) => {
        const row = materialsCatalog[idx];
        if (row?.id == null) return;
        Server.deleteMaterial(
            row.id,
            () => {
                onCatalogRefresh();
                resetMaterialForm({ preserveActiveProvider: true });
                toastActionSuccess(t('toastMaterialDeleted'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };


    useEffect(() => {
        if (open && provider) {
            resetMaterialForm({ preserveActiveProvider: true });
        }
        // Reset only when the dialog opens for a provider, not on every catalog refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, provider?.id]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('materialsEditorTitle')}
                {provider?.name ? ` - ${provider.name}` : ''}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <TextField required label={t('materialName')} value={materialName} onChange={(e) => setMaterialName(e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                        <TextField required label={t('materialCode')} value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} size="small" sx={{ flex: '1 1 160px' }} />
                        <TextField
                            select
                            required
                            label={t('productMaterialUnitOfMeasure')}
                            value={materialUnitOfMeasure}
                            onChange={(e) => setMaterialUnitOfMeasure(normalizeUnitOfMeasure(e.target.value))}
                            size="small"
                            sx={{ width: 160 }}
                        >
                            {PRODUCT_MATERIAL_UNITS_OF_MEASURE.map((unit) => (
                                <MenuItem key={unit} value={unit}>
                                    {t(`unitOfMeasure_${unit}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <TextField
                        select
                        required
                        label={t('materialProviderName')}
                        SelectProps={{
                            multiple: true,
                            renderValue: renderProviderValue,
                        }}
                        value={materialProviderKeysSelected}
                        onChange={(e) => {
                            const v = e.target.value;
                            const next = Array.isArray(v) ? v.map(String) : [String(v)];
                            setMaterialProviderKeysSelected(next);
                        }}
                        size="small"
                    >
                        {sortedProviders.map((p) => (
                            <MenuItem
                                key={providerKey(p)}
                                value={providerKey(p)}
                                sx={multiSelectMenuItemSx}
                            >
                                {p.name || p.contactPerson || t('none')}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" onClick={addOrUpdateMaterial}>
                            {editingMaterialIndex !== null ? t('updateMaterial') : t('addMaterial')}
                        </Button>
                        {editingMaterialIndex !== null && (
                            <Button variant="outlined" onClick={() => resetMaterialForm({ preserveActiveProvider: true })}>
                                {t('cancel')}
                            </Button>
                        )}
                    </Box>

                    <MaterialCatalogTable
                        rows={dialogMaterials}
                        onEdit={beginEditMaterial}
                        onRemove={removeMaterial}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
}
