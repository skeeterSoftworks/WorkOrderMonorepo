import {useEffect, useMemo, useState} from 'react';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {LoggedUser} from '../../models/Common.ts';
import type {CentralMachineTO, WorkstationMachineConfigTO} from '../../models/ApiRequests.ts';
import {Server} from '../../api/Server.ts';

const NONE = '';

export function AdminMachineDetailsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [machines, setMachines] = useState<CentralMachineTO[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>(NONE);
    const [loadingMachines, setLoadingMachines] = useState(true);
    const [loadingSave, setLoadingSave] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const raw = sessionStorage.getItem('userData');
        const user: LoggedUser | null = raw ? JSON.parse(raw) : null;
        if (!user || user.role !== 'ADMIN') {
            navigate('/', {replace: true});
        }
    }, [navigate]);

    const machinesWithId = useMemo(
        () => machines.filter((m) => m.id != null && m.machineName && m.machineName.trim().length > 0),
        [machines]
    );

    useEffect(() => {
        setLoadingMachines(true);
        setError(null);
        Server.getMachinesFromCentralViaLocal(
            (resp: {data?: CentralMachineTO[]}) => {
                const data = Array.isArray(resp?.data) ? resp.data : [];
                setMachines(data);
                setLoadingMachines(false);
            },
            () => {
                setError(t('machinesListLoadError'));
                setLoadingMachines(false);
            }
        );
    }, [t]);

    useEffect(() => {
        if (!machinesWithId.length) return;
        Server.getWorkstationMachine(
            (resp: {data?: WorkstationMachineConfigTO}) => {
                const cfg = resp?.data;
                const mid = cfg?.machineId;
                if (mid != null && machinesWithId.some((m) => m.id === mid)) {
                    setSelectedMachineId(String(mid));
                    return;
                }
                const name = cfg?.machineName?.trim();
                if (name) {
                    const m = machinesWithId.find((x) => x.machineName?.trim() === name);
                    if (m?.id != null) setSelectedMachineId(String(m.id));
                }
            },
            () => {}
        );
    }, [machinesWithId]);

    const handleSave = () => {
        if (!selectedMachineId || selectedMachineId === NONE) {
            setError(t('selectMachineRequired'));
            return;
        }
        const id = Number(selectedMachineId);
        const sel = machinesWithId.find((m) => m.id === id);
        if (!sel?.machineName?.trim()) {
            setError(t('selectMachineRequired'));
            return;
        }
        setError(null);
        setLoadingSave(true);
        const payload: WorkstationMachineConfigTO = {
            machineName: sel.machineName.trim(),
            machineId: id,
        };
        Server.saveWorkstationMachine(
            payload,
            () => {
                setLoadingSave(false);
                window.dispatchEvent(new Event('workstationMachineUpdated'));
            },
            () => {
                setLoadingSave(false);
            }
        );
    };

    return (
        <Container maxWidth="sm" sx={{py: 2}}>
            <AppBar position="static" sx={{mb: 2}}>
                <Toolbar>
                    <IconButton color="inherit" edge="start" onClick={() => navigate('/admin')} sx={{mr: 1}} aria-label={t('backToHome')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">{t('machineDetailsMenu')}</Typography>
                </Toolbar>
            </AppBar>

            {error && (
                <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loadingMachines ? (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        {t('machineDetailsDescription')}
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label={t('workstationMachineSelect')}
                        value={selectedMachineId}
                        onChange={(e) => setSelectedMachineId(e.target.value)}
                        sx={{mb: 2}}
                    >
                        <MenuItem value={NONE}>
                            <em>{t('none')}</em>
                        </MenuItem>
                        {machinesWithId.map((m) => (
                            <MenuItem key={m.id} value={String(m.id)}>
                                {m.machineName}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button variant="contained" onClick={handleSave} disabled={loadingSave || !selectedMachineId || selectedMachineId === NONE}>
                        {loadingSave ? <CircularProgress size={22} color="inherit" /> : t('save')}
                    </Button>
                </>
            )}
        </Container>
    );
}
