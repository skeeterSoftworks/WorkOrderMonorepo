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
import type { MaterialTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
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

function productMaterialMatchesCatalogRow(pm: MaterialTO, c: MaterialTO): boolean {
    if (pm.id != null && c.id != null && pm.id === c.id) return true;
    const pc = (pm.code ?? '').trim();
    const pn = (pm.name ?? '').trim();
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

    useEffect(() => {
        if (!open || !product?.id) {
            setCatalogMaterialRows([]);
            setSelectedCatalogMaterialKeys([]);
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
                const seen = new Set<string>();
                for (const pm of product.materials ?? []) {
                    const row = rows.find(({ material: c }) => productMaterialMatchesCatalogRow(pm, c));
                    if (row && !seen.has(row.key)) {
                        seen.add(row.key);
                        initial.push(row.key);
                    }
                }
                setSelectedCatalogMaterialKeys(initial);
            },
            (err: unknown) => toastServerError(err, t),
        );
    }, [open, product?.id]);

    const handleSave = () => {
        if (!product?.id) return;
        const byKey = new Map(catalogMaterialRows.map((r) => [r.key, r.material]));
        const materials: MaterialTO[] = selectedCatalogMaterialKeys.flatMap((k) => {
            const src = byKey.get(k);
            if (!src) return [];
            const row: MaterialTO = {
                ...src,
                providers: materialProvidersOf(src).map((p) => ({ ...p })),
                provider: undefined,
            };
            return [row];
        });
        const payload: ProductTO = {
            ...product,
            materials,
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
                                            const label = m
                                                ? [m.name, m.code].filter((x) => (x ?? '').toString().trim()).join(' · ') || key
                                                : key;
                                            return <Chip key={key} size="small" label={label} variant="outlined" />;
                                        })}
                                    </Stack>
                                );
                            },
                        }}
                        value={selectedCatalogMaterialKeys}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedCatalogMaterialKeys(Array.isArray(value) ? value.map(String) : [String(value)]);
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
                                    <Typography variant="body2">
                                        {[m.name, m.code].filter((x) => (x ?? '').toString().trim()).join(' · ') || '—'}
                                    </Typography>
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
