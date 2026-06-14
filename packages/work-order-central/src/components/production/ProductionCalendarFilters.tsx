import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { MachineTO } from 'sf-common/src/models/ApiRequests';

export type ProductionCalendarFilterValues = {
    selectedMachineId: number;
    fromDate: string;
    toDate: string;
};

type Props = {
    machines: MachineTO[];
    loading: boolean;
    maxRangeDays: number;
    onSearch: (values: ProductionCalendarFilterValues) => void;
};

function inclusiveDaySpan(fromYmd: string, toYmd: string): number | null {
    if (!fromYmd || !toYmd) return null;
    const [y1, m1, d1] = fromYmd.split('-').map(Number);
    const [y2, m2, d2] = toYmd.split('-').map(Number);
    if ([y1, m1, d1, y2, m2, d2].some((n) => Number.isNaN(n))) return null;
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function addCalendarDaysToYmd(ymd: string, deltaDays: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export function ProductionCalendarFilters({ machines, loading, maxRangeDays, onSearch }: Props) {
    const { t } = useTranslation();
    const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const daySpan = inclusiveDaySpan(fromDate, toDate);
    const rangeOrderInvalid = fromDate !== '' && toDate !== '' && daySpan != null && daySpan < 1;
    const rangeTooLong = fromDate !== '' && toDate !== '' && daySpan != null && daySpan > maxRangeDays;
    const canSearch =
        selectedMachineId != null &&
        fromDate !== '' &&
        toDate !== '' &&
        daySpan != null &&
        daySpan >= 1 &&
        daySpan <= maxRangeDays &&
        !loading;

    const handleSearch = () => {
        if (!canSearch || selectedMachineId == null) return;
        onSearch({ selectedMachineId, fromDate, toDate });
    };

    return (
        <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                <TextField
                    select
                    label={t('machine')}
                    value={selectedMachineId ?? ''}
                    onChange={(e) => setSelectedMachineId(e.target.value ? Number(e.target.value) : undefined)}
                    size="small"
                    sx={{ minWidth: 200 }}
                >
                    <MenuItem value="">{t('none')}</MenuItem>
                    {machines.map((m) => (
                        <MenuItem key={m.id} value={m.id}>{m.machineName}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t('dateFrom')}
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        lang: 'sr-RS',
                        max: toDate || undefined,
                        ...(toDate ? { min: addCalendarDaysToYmd(toDate, -(maxRangeDays - 1)) } : {}),
                    }}
                />
                <TextField
                    label={t('dateUntil')}
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        lang: 'en-GB',
                        min: fromDate || undefined,
                        ...(fromDate ? { max: addCalendarDaysToYmd(fromDate, maxRangeDays - 1) } : {}),
                    }}
                />
                <Button variant="contained" color="primary" onClick={handleSearch} disabled={!canSearch}>
                    {t('searchAction')}
                </Button>
            </Box>
            {(rangeOrderInvalid || rangeTooLong) && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {rangeOrderInvalid
                        ? t('productionDateRangeOrderInvalid')
                        : t('productionDateRangeMaxDays', { max: maxRangeDays })}
                </Typography>
            )}
        </>
    );
}
