import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderStatus } from 'sf-common/src/models/ApiRequests';

export type MaterialOrderSearchForm = {
    status: string;
    periodFrom: string;
    periodTo: string;
    code: string;
    materialName: string;
    materialProviderName: string;
    certificatePresentOnly: boolean;
};

type Props = {
    initialFilters: MaterialOrderSearchForm;
    statusOptions: MaterialOrderStatus[];
    ordersLoading: boolean;
    resultCount: number;
    totalElements: number;
    onApply: (filters: MaterialOrderSearchForm) => void;
};

export function MaterialOrderSearchFilters({
    initialFilters,
    statusOptions,
    ordersLoading,
    resultCount,
    totalElements,
    onApply,
}: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<MaterialOrderSearchForm>(initialFilters);

    useEffect(() => {
        setDraft(initialFilters);
    }, [initialFilters]);

    const updateDraft = <K extends keyof MaterialOrderSearchForm>(key: K, value: MaterialOrderSearchForm[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Box
            component="form"
            autoComplete="off"
            onSubmit={(e) => {
                e.preventDefault();
                onApply(draft);
            }}
            sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}
        >
            <TextField
                select
                label={t('materialOrderStatusFilter')}
                value={draft.status}
                onChange={(e) => updateDraft('status', e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
            >
                <MenuItem value="ALL">{t('materialOrderStatusFilterAll')}</MenuItem>
                {statusOptions.map((s) => (
                    <MenuItem key={s} value={s}>{t(`materialOrderStatus_${s}`)}</MenuItem>
                ))}
            </TextField>
            <TextField label={t('dateFrom')} type="date" value={draft.periodFrom} onChange={(e) => updateDraft('periodFrom', e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField label={t('dateUntil')} type="date" value={draft.periodTo} onChange={(e) => updateDraft('periodTo', e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField label={t('materialOrderCode')} value={draft.code} onChange={(e) => updateDraft('code', e.target.value)} size="small" sx={{ minWidth: 140 }} />
            <TextField label={t('materialName')} value={draft.materialName} onChange={(e) => updateDraft('materialName', e.target.value)} size="small" sx={{ minWidth: 160 }} />
            <TextField label={t('materialProviderName')} value={draft.materialProviderName} onChange={(e) => updateDraft('materialProviderName', e.target.value)} size="small" sx={{ minWidth: 160 }} />
            <FormControlLabel
                control={<Checkbox checked={draft.certificatePresentOnly} onChange={(e) => updateDraft('certificatePresentOnly', e.target.checked)} size="small" />}
                label={t('materialOrderCertificatePresentOnly')}
            />
            <Button type="submit" variant="contained" disabled={ordersLoading}>{t('searchAction')}</Button>
            <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                {t('materialOrderFilterCount', { count: resultCount, total: totalElements })}
            </Typography>
        </Box>
    );
}
