import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    RoleAccessGuard,
    Server,
    canAccessCentralProductionOverview,
    readLoggedUser,
} from 'sf-common';
import type { ApplicationUserTO, MachineTO, WorkSessionTO } from 'sf-common/src/models/ApiRequests';
import { TableActionsRow, tableActionIconButtonSx, tableActionsTableCellSx } from '../shared/tableActions';
import { ProductionSessionDetailsDialog } from './ProductionSessionDetailsDialog';
import {
    formatSessionDateTime,
    operatorLabel,
    todayYmd,
    workOrderSessionLabel,
} from './productionOverviewDisplay';

function unwrapList<T>(response: { data?: T[] | { data?: T[] } }): T[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    return [];
}

function userLabel(user: ApplicationUserTO): string {
    const name = [user.name?.trim(), user.surname?.trim()].filter(Boolean).join(' ');
    return name || (user.id != null ? `#${user.id}` : '—');
}

export function ProductionOverviewPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = readLoggedUser();

    const [date, setDate] = useState(todayYmd);
    const [machineId, setMachineId] = useState<number | ''>('');
    const [userId, setUserId] = useState<number | ''>('');
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [users, setUsers] = useState<ApplicationUserTO[]>([]);
    const [sessions, setSessions] = useState<WorkSessionTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [detailsSession, setDetailsSession] = useState<WorkSessionTO | null>(null);

    useEffect(() => {
        Server.getAllMachines(
            (response: { data?: MachineTO[] | { data?: MachineTO[] } }) => {
                setMachines(unwrapList<MachineTO>(response).filter((m) => m.id != null));
            },
            () => {},
        );
        Server.getAllUsers(
            (response: { data?: ApplicationUserTO[] | { data?: ApplicationUserTO[] } }) => {
                setUsers(unwrapList<ApplicationUserTO>(response).filter((u) => u.id != null));
            },
            () => {},
        );
    }, []);

    const machinesSorted = useMemo(
        () => [...machines].sort((a, b) => (a.machineName ?? '').localeCompare(b.machineName ?? '')),
        [machines],
    );
    const usersSorted = useMemo(
        () => [...users].sort((a, b) => userLabel(a).localeCompare(userLabel(b))),
        [users],
    );

    useEffect(() => {
        if (!date) return;
        setLoading(true);
        setError(null);
        Server.searchWorkSessions(
            {
                date,
                machineId: machineId === '' ? undefined : machineId,
                userId: userId === '' ? undefined : userId,
            },
            (response: { data?: WorkSessionTO[] | { data?: WorkSessionTO[] } }) => {
                setSessions(unwrapList<WorkSessionTO>(response));
                setLoading(false);
            },
            () => {
                setSessions([]);
                setLoading(false);
                setError(t('productionOverviewLoadError'));
            },
        );
    }, [date, machineId, userId, t]);

    const openDetails = (session: WorkSessionTO) => {
        if (session.id == null) return;
        setDetailsOpen(true);
        setDetailsSession(session);
        setDetailsLoading(true);
        setDetailsError(null);
        Server.getWorkSession(
            session.id,
            (response: { data?: WorkSessionTO }) => {
                setDetailsSession(response?.data ?? session);
                setDetailsLoading(false);
            },
            () => {
                setDetailsLoading(false);
                setDetailsError(t('productionOverviewDetailsLoadError'));
            },
        );
    };

    return (
        <RoleAccessGuard user={user} allowed={canAccessCentralProductionOverview(user)}>
            <Container maxWidth="xl">
                <AppBar position="static">
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/')}
                            sx={{ mr: 1 }}
                            aria-label={t('backToHome')}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">
                            {t('productionOverview')} - {t('welcome')}, {user?.name} {user?.surname}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Paper sx={{ p: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
                        <TextField
                            label={t('date')}
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <TextField
                            select
                            label={t('machine')}
                            value={machineId}
                            onChange={(e) => setMachineId(e.target.value === '' ? '' : Number(e.target.value))}
                            size="small"
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="">{t('filterAll')}</MenuItem>
                            {machinesSorted.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.machineName || `#${m.id}`}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('user')}
                            value={userId}
                            onChange={(e) => setUserId(e.target.value === '' ? '' : Number(e.target.value))}
                            size="small"
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="">{t('filterAll')}</MenuItem>
                            {usersSorted.map((u) => (
                                <MenuItem key={u.id} value={Number(u.id)}>
                                    {userLabel(u)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    {loading && (
                        <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                            {t('loadingDetails')}
                        </Typography>
                    )}
                    {error && (
                        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                            {error}
                        </Typography>
                    )}

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('sessionStart')}</TableCell>
                                    <TableCell>{t('sessionEnd')}</TableCell>
                                    <TableCell>{t('workOrder')}</TableCell>
                                    <TableCell>{t('machine')}</TableCell>
                                    <TableCell>{t('operator')}</TableCell>
                                    <TableCell align="right">{t('productionSessionGoodCount')}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        {t('actions')}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('productionOverviewEmpty')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>{formatSessionDateTime(session.sessionStart)}</TableCell>
                                            <TableCell>
                                                {session.sessionEnd
                                                    ? formatSessionDateTime(session.sessionEnd)
                                                    : t('sessionInProgress')}
                                            </TableCell>
                                            <TableCell>{workOrderSessionLabel(session)}</TableCell>
                                            <TableCell>{session.stationId?.trim() || '—'}</TableCell>
                                            <TableCell>{operatorLabel(session)}</TableCell>
                                            <TableCell align="right">{session.productCount ?? 0}</TableCell>
                                            <TableCell align="right" sx={tableActionsTableCellSx}>
                                                <TableActionsRow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openDetails(session)}
                                                        sx={tableActionIconButtonSx.view}
                                                        title={t('viewProductionSessionDetails')}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </TableActionsRow>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                <ProductionSessionDetailsDialog
                    open={detailsOpen}
                    session={detailsSession}
                    loading={detailsLoading}
                    error={detailsError}
                    onClose={() => {
                        setDetailsOpen(false);
                        setDetailsSession(null);
                        setDetailsError(null);
                    }}
                />
            </Container>
        </RoleAccessGuard>
    );
}
