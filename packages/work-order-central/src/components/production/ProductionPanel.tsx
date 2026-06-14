import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MachineBookingTO, MachineTO } from 'sf-common/src/models/ApiRequests';
import { formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';
import { Server } from 'sf-common';
import { bookingStatusTranslationKey, bookingTypeTranslationKey } from '../../util/bookingI18n';
import { ProductionCalendarFilters, type ProductionCalendarFilterValues } from './ProductionCalendarFilters';

const MAX_CALENDAR_RANGE_DAYS_INCLUSIVE = 14;

function toIsoRange(fromDate: string, toDate: string): { from: string; to: string } | null {
    if (!fromDate || !toDate) return null;
    return { from: `${fromDate}T00:00`, to: `${toDate}T23:59` };
}

export function ProductionPanel() {
    const { t } = useTranslation();
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [searchedMachineId, setSearchedMachineId] = useState<number | undefined>(undefined);
    const [bookings, setBookings] = useState<MachineBookingTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [calendarRange, setCalendarRange] = useState<{ from: string; to: string } | null>(null);

    useEffect(() => {
        Server.getAllMachines(
            (response: { data?: MachineTO[] | { data?: MachineTO[] } }) => {
                let data: MachineTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMachines(data);
            },
            () => {},
        );
    }, []);

    const handleSearch = (values: ProductionCalendarFilterValues) => {
        setError(null);
        const range = toIsoRange(values.fromDate, values.toDate);
        if (!range) {
            setError(t('allFieldsRequired'));
            return;
        }
        setLoading(true);
        Server.getMachineBookingsForMachine(
            values.selectedMachineId,
            range.from,
            range.to,
            (response: { data?: MachineBookingTO[] | { data?: MachineBookingTO[] } }) => {
                let data: MachineBookingTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setBookings(data);
                setSearchedMachineId(values.selectedMachineId);
                setCalendarRange({ from: values.fromDate, to: values.toDate });
                setLoading(false);
            },
            (err: { response?: { data?: unknown } }) => {
                const body = err?.response?.data;
                setError(typeof body === 'string' ? body : t('errorSchedulingMachine'));
                setLoading(false);
            },
        );
    };

    const formatDateTime = (value?: string): string => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : formatEuropeanDateTime(d);
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
                <Typography variant="h6" gutterBottom>{t('production')}</Typography>
                <ProductionCalendarFilters
                    machines={machines}
                    loading={loading}
                    maxRangeDays={MAX_CALENDAR_RANGE_DAYS_INCLUSIVE}
                    onSearch={handleSearch}
                />
                {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {searchedMachineId ? getMachineLabel(searchedMachineId) : t('machine')}
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
                            {bookings.map((b) => {
                                const typeKey = bookingTypeTranslationKey(b.type);
                                const statusKey = bookingStatusTranslationKey(b.status);
                                return (
                                    <TableRow key={b.id}>
                                        <TableCell>{formatDateTime(b.startDateTime)}</TableCell>
                                        <TableCell>{formatDateTime(b.endDateTime)}</TableCell>
                                        <TableCell>{b.workOrderId ?? '—'}</TableCell>
                                        <TableCell>{typeKey ? t(typeKey) : b.type ?? '—'}</TableCell>
                                        <TableCell>{statusKey ? t(statusKey) : b.status ?? '—'}</TableCell>
                                        <TableCell>{b.comment ?? ''}</TableCell>
                                    </TableRow>
                                );
                            })}
                            {bookings.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Typography variant="body2" color="text.secondary">{t('noProcessedProducts')}</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {calendarRange != null && daysInRange.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>{t('calendar')}</Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('time')}</TableCell>
                                    {daysInRange.map((d) => (
                                        <TableCell key={d} align="center">{d}</TableCell>
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
                                                    sx={{ p: 0.5, bgcolor: occupied ? 'error.light' : 'success.light', color: 'common.black', fontSize: '0.75rem' }}
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
