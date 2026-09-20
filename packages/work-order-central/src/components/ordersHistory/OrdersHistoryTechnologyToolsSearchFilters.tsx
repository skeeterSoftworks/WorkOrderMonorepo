import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export type TechnologyToolHistorySearchForm = {
    productReference: string;
    toolName: string;
    workOrderCode: string;
};

type Props = {
    initialFilters: TechnologyToolHistorySearchForm;
    loading: boolean;
    resultCount: number;
    totalElements: number;
    onApply: (filters: TechnologyToolHistorySearchForm) => void;
};

export function OrdersHistoryTechnologyToolsSearchFilters({
    initialFilters,
    loading,
    resultCount,
    totalElements,
    onApply,
}: Props) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<TechnologyToolHistorySearchForm>(initialFilters);

    useEffect(() => {
        setDraft(initialFilters);
    }, [initialFilters]);

    const updateDraft = <K extends keyof TechnologyToolHistorySearchForm>(
        key: K,
        value: TechnologyToolHistorySearchForm[K],
    ) => {
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
                label={t('catalogueId')}
                value={draft.productReference}
                onChange={(e) => updateDraft('productReference', e.target.value)}
                size="small"
                sx={{ minWidth: 160 }}
            />
            <TextField
                label={t('toolName')}
                value={draft.toolName}
                onChange={(e) => updateDraft('toolName', e.target.value)}
                size="small"
                sx={{ minWidth: 160 }}
            />
            <TextField
                label={t('workOrder')}
                value={draft.workOrderCode}
                onChange={(e) => updateDraft('workOrderCode', e.target.value)}
                size="small"
                sx={{ minWidth: 160 }}
            />
            <Button type="submit" variant="contained" disabled={loading}>
                {t('searchAction')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                {t('ordersHistoryTechnologyToolsFilterCount', {
                    count: resultCount,
                    total: totalElements,
                })}
            </Typography>
        </Box>
    );
}
