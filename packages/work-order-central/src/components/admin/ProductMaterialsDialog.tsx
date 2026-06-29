import { useEffect, useState } from 'react';
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
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import type { MaterialTO, ProductMaterialTO, ProductMaterialUnitOfMeasure, ProductTO } from 'sf-common/src/models/ApiRequests';
import { PRODUCT_MATERIAL_UNITS_OF_MEASURE } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { filterDecimalNumericInput, parseDecimalNumericInputToNumber } from 'sf-common/src/util/DataUtils';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

/** Stable row keys for server materials (handles duplicate code/name without id). */
function assignCatalogRowKeys(materials: MaterialTO[]): { key: string; material: MaterialTO }[] {
    const used = new Map<string, number>();
    return materials.map((m) => {
        const base = m.id != null ? `id:${m.id}` : `code:${(m.code ?? '').trim()}|name:${(m.name ?? '').trim()}`;
        const n = (used.get(base) ?? 0) + 1;
        used.set(base, n);
        const key = n === 1 ? base : `${base}#${n}`;
        return { key, material: m };
    });
}

function productMaterialMatchesCatalogRow(pm: ProductMaterialTO, c: MaterialTO): boolean {
    if (pm.materialId != null && c.id != null && pm.materialId === c.id) return true;
    const pc = (pm.materialCode ?? '').trim();
    const pn = (pm.materialName ?? '').trim();
    const cc = (c.code ?? '').trim();
    const cn = (c.name ?? '').trim();
    if (pc !== '' && pc === cc && pn === cn) return true;
    if (pc === '' && cc === '' && pn !== '' && pn === cn) return true;
    return false;
}

function materialProvidersOf(material: MaterialTO): NonNullable<MaterialTO['providers']> {
    if (Array.isArray(material.providers)) return material.providers;
    return material.provider ? [material.provider] : [];
}

function materialLabel(m: MaterialTO): string {
    return [m.name, m.code].filter((x) => (x ?? '').toString().trim()).join(' · ') || '—';
}

const DEFAULT_UNIT_OF_MEASURE: ProductMaterialUnitOfMeasure = 'PCS';

function materialUnitLabel(
    material: MaterialTO | undefined,
    t: (key: string) => string,
): string {
    const unit = material?.unitOfMeasure;
    if (unit && (PRODUCT_MATERIAL_UNITS_OF_MEASURE as readonly string[]).includes(unit)) {
        return t(`unitOfMeasure_${unit}`);
    }
    return t(`unitOfMeasure_${DEFAULT_UNIT_OF_MEASURE}`);
}

const multiSelectMenuItemSx = (theme: any) => ({
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

type Props = {
    open: boolean;
    product: ProductTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function ProductMaterialsDialog({ open, product, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [catalogMaterialRows, setCatalogMaterialRows] = useState<{ key: string; material: MaterialTO }[]>([]);
    const [selectedCatalogMaterialKeys, setSelectedCatalogMaterialKeys] = useState<string[]>([]);
    const [quantityByKey, setQuantityByKey] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open || !product?.id) {
            setCatalogMaterialRows([]);
            setSelectedCatalogMaterialKeys([]);
            setQuantityByKey({});
            return;
        }
        Server.getAllMaterials(
            (response: unknown) => {
                const r = response as { data?: MaterialTO[] | { data?: MaterialTO[] } };
                const data = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
                const linked = data.filter((m) => materialProvidersOf(m).length > 0);
                const rows = assignCatalogRowKeys(linked);
                setCatalogMaterialRows(rows);
                const initial: string[] = [];
                const quantities: Record<string, string> = {};
                const seen = new Set<string>();
                for (const pm of product.productMaterials ?? []) {
                    const row = rows.find(({ material: c }) => productMaterialMatchesCatalogRow(pm, c));
                    if (row && !seen.has(row.key)) {
                        seen.add(row.key);
                        initial.push(row.key);
                        const q = pm.quantityPerProductUnit;
                        quantities[row.key] = q != null && Number.isFinite(q) && q > 0 ? String(q) : '1';
                    }
                }
                setSelectedCatalogMaterialKeys(initial);
                setQuantityByKey(quantities);
            },
            (err: unknown) => toastServerError(err, t),
        );
    }, [open, product?.id]);

    const handleSelectionChange = (keys: string[]) => {
        setSelectedCatalogMaterialKeys(keys);
        setQuantityByKey((prev) => {
            const next = { ...prev };
            for (const key of keys) {
                if (!next[key]?.trim()) {
                    next[key] = '1';
                }
            }
            return next;
        });
    };

    const handleSave = () => {
        if (!product?.id) return;
        const byKey = new Map(catalogMaterialRows.map((r) => [r.key, r.material]));
        const productMaterials: ProductMaterialTO[] = selectedCatalogMaterialKeys.flatMap((k) => {
            const src = byKey.get(k);
            if (!src?.id) return [];
            const parsed = parseDecimalNumericInputToNumber(quantityByKey[k] ?? '1');
            const quantity = parsed != null && parsed > 0 ? parsed : 1;
            const existing = (product.productMaterials ?? []).find((pm) => pm.materialId === src.id);
            return [{
                id: existing?.id,
                materialId: src.id,
                quantityPerProductUnit: quantity,
            }];
        });
        const payload: ProductTO = {
            ...product,
            productMaterials,
        };
        Server.editProduct(
            payload,
            () => {
                onSaved();
                onClose();
                toastActionSuccess(t('toastProductUpdated'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box component="span" sx={{ pr: 1 }}>
                    {t('materialsEditorTitle')}
                    {product?.name ? ` — ${product.name}` : ''}
                </Box>
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        select
                        label={t('productMaterialsCatalogSelectLabel')}
                        SelectProps={{
                            multiple: true,
                            displayEmpty: true,
                            renderValue: (selected) => {
                                const keys = selected as string[];
                                if (keys.length === 0) {
                                    return (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('productMaterialsCatalogPlaceholder')}
                                        </Typography>
                                    );
                                }
                                return (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {keys.map((key) => {
                                            const row = catalogMaterialRows.find((r) => r.key === key);
                                            const m = row?.material;
                                            const label = m ? materialLabel(m) : key;
                                            return <Chip key={key} size="small" label={label} variant="outlined" />;
                                        })}
                                    </Stack>
                                );
                            },
                        }}
                        value={selectedCatalogMaterialKeys}
                        onChange={(e) => {
                            const value = e.target.value;
                            handleSelectionChange(Array.isArray(value) ? value.map(String) : [String(value)]);
                        }}
                        fullWidth
                        disabled={catalogMaterialRows.length === 0}
                        helperText={
                            catalogMaterialRows.length === 0
                                ? t('productMaterialsCatalogEmpty')
                                : t('productMaterialsCatalogHint')
                        }
                    >
                        {catalogMaterialRows.map(({ key, material: m }) => (
                            <MenuItem key={key} value={key} sx={multiSelectMenuItemSx}>
                                <Stack direction="column" spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                                    <Typography variant="body2">{materialLabel(m)}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {materialProvidersOf(m)
                                            .map((p) => p.name || p.contactPerson)
                                            .filter(Boolean)
                                            .join(', ') || '—'}
                                    </Typography>
                                </Stack>
                            </MenuItem>
                        ))}
                    </TextField>

                    {selectedCatalogMaterialKeys.length > 0 && (
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle2">{t('productMaterialQuantitiesTitle')}</Typography>
                            {selectedCatalogMaterialKeys.map((key) => {
                                const row = catalogMaterialRows.find((r) => r.key === key);
                                const m = row?.material;
                                return (
                                    <Stack key={key} direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                                            {m ? materialLabel(m) : key}
                                        </Typography>
                                        <TextField
                                            label={t('productMaterialQuantityPerProductUnit')}
                                            value={quantityByKey[key] ?? '1'}
                                            onChange={(e) => {
                                                const next = filterDecimalNumericInput(e.target.value);
                                                setQuantityByKey((prev) => ({ ...prev, [key]: next }));
                                            }}
                                            size="small"
                                            sx={{ width: 120 }}
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ width: 72, flexShrink: 0 }}>
                                            {materialUnitLabel(m, t)}
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSave}>
                            {t('saveAction')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
