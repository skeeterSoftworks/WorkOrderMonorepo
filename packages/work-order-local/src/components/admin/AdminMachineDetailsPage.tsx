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
import type {CentralMachineTO} from '../../models/ApiRequests.ts';
import {Server} from '../../api/Server.ts';

export function AdminMachineDetailsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [machines, setMachines] = useState<CentralMachineTO[]>([]);
    const [selectedName, setSelectedName] = useState<string>('');
    const [loadingMachines, setLoadingMachines] = useState(true);
    const [loadingSave, setLoadingSave] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveOk, setSaveOk] = useState(false);

    useEffect(() => {
        const raw = sessionStorage.getItem('userData');
        const user: LoggedUser | null = raw ? JSON.parse(raw) : null;
        if (!user || user.role !== 'ADMIN') {
            navigate('/', {replace: true});
        }
    }, [navigate]);

    const machineNames = useMemo(() => {
        const names = machines
            .map((m) => m.machineName?.trim())
            .filter((n): n is string => !!n && n.length > 0);
        return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    }, [machines]);

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
        Server.getWorkstationMachine(
            (resp: {data?: {machineName?: string | null}}) => {
                const n = resp?.data?.machineName;
                setSelectedName(n && n.trim() ? n.trim() : '');
            },
            () => {}
        );
    }, []);

    const handleSave = () => {
        if (!selectedName.trim()) {
            setError(t('selectMachineRequired'));
            return;
        }
        setError(null);
        setSaveOk(false);
        setLoadingSave(true);
        Server.saveWorkstationMachine(
            {machineName: selectedName.trim()},
            () => {
                setLoadingSave(false);
                setSaveOk(true);
                window.dispatchEvent(new Event('workstationMachineUpdated'));
            },
            () => {
                setLoadingSave(false);
                setError(t('saveWorkstationMachineError'));
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

            {saveOk && (
                <Alert severity="success" sx={{mb: 2}} onClose={() => setSaveOk(false)}>
                    {t('workstationMachineSaved')}
                </Alert>
            )}
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
                        value={selectedName}
                        onChange={(e) => setSelectedName(e.target.value)}
                        sx={{mb: 2}}
                    >
                        <MenuItem value="">
                            <em>{t('none')}</em>
                        </MenuItem>
                        {machineNames.map((name) => (
                            <MenuItem key={name} value={name}>
                                {name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button variant="contained" onClick={handleSave} disabled={loadingSave || !selectedName.trim()}>
                        {loadingSave ? <CircularProgress size={22} color="inherit" /> : t('save')}
                    </Button>
                </>
            )}
        </Container>
    );
}
