import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MachineTO, MachineBookingTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';

const MAX_CALENDAR_RANGE_DAYS_INCLUSIVE = 14;

function toIsoRange(fromDate: string, toDate: string): { from: string; to: string } | null {
    if (!fromDate || !toDate) return null;
    // local midnight to end of day
    return {
        from: `${fromDate}T00:00`,
        to: `${toDate}T23:59`,
    };
}

/** Inclusive number of calendar days from `fromYmd` through `toYmd`, or `null` if invalid. */
function inclusiveDaySpan(fromYmd: string, toYmd: string): number | null {
    if (!fromYmd || !toYmd) return null;
    const [y1, m1, d1] = fromYmd.split('-').map(Number);
    const [y2, m2, d2] = toYmd.split('-').map(Number);
    if ([y1, m1, d1, y2, m2, d2].some((n) => Number.isNaN(n))) return null;
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diffDays + 1;
}

function addCalendarDaysToYmd(ymd: string, deltaDays: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export function ProductionPanel() {
    const { t } = useTranslation();

    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [bookings, setBookings] = useState<MachineBookingTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Set after a successful search; drives the calendar grid only. */
    const [calendarRange, setCalendarRange] = useState<{ from: string; to: string } | null>(null);

    useEffect(() => {
        setCalendarRange(null);
        setBookings([]);
    }, [fromDate, toDate, selectedMachineId]);

    useEffect(() => {
        Server.getAllMachines(
            (response: any) => {
                let data: MachineTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMachines(data);
            },
            () => {},
        );
    }, []);

    const daySpan = inclusiveDaySpan(fromDate, toDate);
    const rangeOrderInvalid = fromDate !== '' && toDate !== '' && daySpan != null && daySpan < 1;
    const rangeTooLong =
        fromDate !== '' && toDate !== '' && daySpan != null && daySpan > MAX_CALENDAR_RANGE_DAYS_INCLUSIVE;

    const canSearch =
        selectedMachineId != null &&
        fromDate !== '' &&
        toDate !== '' &&
        daySpan != null &&
        daySpan >= 1 &&
        daySpan <= MAX_CALENDAR_RANGE_DAYS_INCLUSIVE &&
        !loading;

    const handleLoadBookings = () => {
        setError(null);
        if (!canSearch || !selectedMachineId) {
            if (!selectedMachineId || !fromDate || !toDate) {
                setError(t('allFieldsRequired'));
            } else if (rangeOrderInvalid) {
                setError(t('productionDateRangeOrderInvalid'));
            } else if (rangeTooLong) {
                setError(t('productionDateRangeMaxDays', { max: MAX_CALENDAR_RANGE_DAYS_INCLUSIVE }));
            }
            return;
        }
        const range = toIsoRange(fromDate, toDate);
        if (!range) {
            setError(t('allFieldsRequired'));
            return;
        }
        setLoading(true);
        Server.getMachineBookingsForMachine(
            selectedMachineId,
            range.from,
            range.to,
            (response: any) => {
                let data: MachineBookingTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setBookings(data);
                setCalendarRange({ from: fromDate, to: toDate });
                setLoading(false);
            },
            (err: any) => {
                const body = err?.response?.data;
                setError(typeof body === 'string' ? body : t('errorSchedulingMachine'));
                setLoading(false);
            }
        );
    };

    const formatDateTime = (value?: string): string => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
    };

    const daysInRange: string[] = (() => {
        if (!calendarRange) return [];
        const { from: crFrom, to: crTo } = calendarRange;
        const result: string[] = [];
        const [sy, sm, sd] = crFrom.split('-').map(Number);
        const [ey, em, ed] = crTo.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            result.push(`${y}-${m}-${day}`);
        }
        return result;
    })();

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const isSlotOccupied = (day: string, hour: number) => {
        const slotStart = new Date(`${day}T${hour.toString().padStart(2, '0')}:00`);
        const slotEnd = new Date(`${day}T${(hour + 1).toString().padStart(2, '0')}:00`);
        return bookings.some((b) => {
            if (!b.startDateTime || !b.endDateTime) return false;
            const bStart = new Date(b.startDateTime);
            const bEnd = new Date(b.endDateTime);
            return bStart < slotEnd && bEnd > slotStart;
        });
    };

    const getMachineLabel = (id?: number) => {
        if (!id) return '';
        const m = machines.find((mm) => mm.id === id);
        return m?.machineName ?? `#${id}`;
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('production')}
                </Typography>
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
                            <MenuItem key={m.id} value={m.id}>
                                {m.machineName}
                            </MenuItem>
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
                            max: toDate || undefined,
                            ...(toDate
                                ? { min: addCalendarDaysToYmd(toDate, -(MAX_CALENDAR_RANGE_DAYS_INCLUSIVE - 1)) }
                                : {}),
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
                            min: fromDate || undefined,
                            ...(fromDate
                                ? { max: addCalendarDaysToYmd(fromDate, MAX_CALENDAR_RANGE_DAYS_INCLUSIVE - 1) }
                                : {}),
                        }}
                    />
                    <Button variant="contained" color="primary" onClick={handleLoadBookings} disabled={!canSearch}>
                        {t('searchAction')}
                    </Button>
                </Box>
                {(rangeOrderInvalid || rangeTooLong) && !error && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                        {rangeOrderInvalid
                            ? t('productionDateRangeOrderInvalid')
                            : t('productionDateRangeMaxDays', { max: MAX_CALENDAR_RANGE_DAYS_INCLUSIVE })}
                    </Typography>
                )}
                {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                        {error}
                    </Typography>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {selectedMachineId ? getMachineLabel(selectedMachineId) : t('machine')}
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('startDateTime')}</TableCell>
                                <TableCell>{t('endDateTime')}</TableCell>
                                <TableCell>{t('workOrder')}</TableCell>
                                <TableCell>{t('bookingType')}</TableCell>
                                <TableCell>{t('status')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bookings.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell>{formatDateTime(b.startDateTime)}</TableCell>
                                    <TableCell>{formatDateTime(b.endDateTime)}</TableCell>
                                    <TableCell>{b.workOrderId ?? '—'}</TableCell>
                                    <TableCell>{b.type ?? '—'}</TableCell>
                                    <TableCell>{b.status ?? '—'}</TableCell>
                                    <TableCell>{b.comment ?? ''}</TableCell>
                                </TableRow>
                            ))}
                            {bookings.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('noProcessedProducts')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {calendarRange != null && daysInRange.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('calendar')}
                    </Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('time')}</TableCell>
                                    {daysInRange.map((d) => (
                                        <TableCell key={d} align="center">
                                            {d}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {hours.map((h) => (
                                    <TableRow key={h}>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${h.toString().padStart(2, '0')}:00`}</TableCell>
                                        {daysInRange.map((d) => {
                                            const occupied = isSlotOccupied(d, h);
                                            return (
                                                <TableCell
                                                    key={`${d}-${h}`}
                                                    sx={{
                                                        p: 0.5,
                                                        bgcolor: occupied ? 'error.light' : 'success.light',
                                                        color: 'common.black',
                                                        fontSize: '0.75rem',
                                                    }}
                                                >
                                                    {occupied ? t('occupied') : t('free')}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

