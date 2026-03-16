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

function toIsoRange(fromDate: string, toDate: string): { from: string; to: string } | null {
    if (!fromDate || !toDate) return null;
    // local midnight to end of day
    return {
        from: `${fromDate}T00:00`,
        to: `${toDate}T23:59`,
    };
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

    const handleLoadBookings = () => {
        setError(null);
        if (!selectedMachineId || !fromDate || !toDate) {
            setError(t('allFieldsRequired'));
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
        if (!fromDate || !toDate) return [];
        const result: string[] = [];
        const start = new Date(fromDate);
        const end = new Date(toDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            result.push(d.toISOString().slice(0, 10));
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
                    />
                    <TextField
                        label={t('dateUntil')}
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button variant="contained" color="primary" onClick={handleLoadBookings} disabled={loading}>
                        {t('searchAction')}
                    </Button>
                </Box>
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

            {daysInRange.length > 0 && (
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

