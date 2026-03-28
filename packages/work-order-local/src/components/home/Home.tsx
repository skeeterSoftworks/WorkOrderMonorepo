import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type {LoggedUser} from '../../models/Common.ts';
import type {WorkStationPreconditionItem} from '../../models/ApiRequests.ts';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {Server} from '../../api/Server.ts';

const START_DELAY_MS = 5000;

function preconditionText(item: WorkStationPreconditionItem, lang: 'sr' | 'en'): string {
    if (lang === 'sr') {
        return (item.sr || item.en || '').trim();
    }
    return (item.en || item.sr || '').trim();
}

function loadWorkstationMachineFlag(setReady: (v: boolean) => void) {
    Server.getWorkstationMachine(
        (resp: {data?: {machineName?: string | null; machineId?: number | null}}) => {
            const n = resp?.data?.machineName;
            const id = resp?.data?.machineId;
            const nameOk = !!n && String(n).trim().length > 0;
            const idOk = id != null && Number(id) > 0;
            setReady(nameOk || idOk);
        },
        () => setReady(false)
    );
}

export function Home() {
    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();

    const [workstationMachineReady, setWorkstationMachineReady] = useState(false);
    const [preModalOpen, setPreModalOpen] = useState(false);
    const [preconditionItems, setPreconditionItems] = useState<WorkStationPreconditionItem[]>([]);
    const [loadingPreconditions, setLoadingPreconditions] = useState(false);
    const [fetchErrorKey, setFetchErrorKey] = useState<string | null>(null);
    const [canStartProduction, setCanStartProduction] = useState(false);

    const lang: 'sr' | 'en' = i18n.language?.toLowerCase().startsWith('sr') ? 'sr' : 'en';

    useEffect(() => {
        loadWorkstationMachineFlag(setWorkstationMachineReady);
        const onUpdated = () => loadWorkstationMachineFlag(setWorkstationMachineReady);
        window.addEventListener('workstationMachineUpdated', onUpdated);
        return () => window.removeEventListener('workstationMachineUpdated', onUpdated);
    }, []);

    useEffect(() => {
        if (!preModalOpen) {
            setPreconditionItems([]);
            setFetchErrorKey(null);
            setLoadingPreconditions(false);
            setCanStartProduction(false);
            return;
        }

        setCanStartProduction(false);
        const unlock = window.setTimeout(() => setCanStartProduction(true), START_DELAY_MS);
        return () => window.clearTimeout(unlock);
    }, [preModalOpen]);

    useEffect(() => {
        if (!preModalOpen) return;

        setLoadingPreconditions(true);
        setFetchErrorKey(null);
        setPreconditionItems([]);

        Server.fetchStationConfigWithPreconditions(
            (resp: {data?: {woPreconditionsJSON?: string}}) => {
                try {
                    const raw = resp?.data?.woPreconditionsJSON;
                    if (raw == null || raw === '') {
                        setPreconditionItems([]);
                        setLoadingPreconditions(false);
                        return;
                    }
                    const arr: WorkStationPreconditionItem[] =
                        typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (!Array.isArray(arr)) {
                        setFetchErrorKey('preconditionsParseError');
                        setPreconditionItems([]);
                    } else {
                        setPreconditionItems(arr);
                    }
                } catch {
                    setFetchErrorKey('preconditionsParseError');
                    setPreconditionItems([]);
                }
                setLoadingPreconditions(false);
            },
            () => {
                setLoadingPreconditions(false);
                setFetchErrorKey('preconditionsLoadError');
            }
        );
    }, [preModalOpen]);

    const homeButtonStyle: Record<string, unknown> = {
        height: '18vh',
        width: '18vh',
        borderRadius: '20px',
        textTransform: 'none',
        fontSize: '1.1rem',
        fontWeight: 600,
        boxShadow: 4,
    };

    const handleStartProduction = () => {
        setPreModalOpen(false);
        navigate('/production');
    };

    const isAdmin = userData && userData.role === 'ADMIN';

    return (
        <Box sx={{position: 'relative', width: '100%', minHeight: '60vh'}}>
            {isAdmin && (
                <IconButton
                    component={Link}
                    to="/admin"
                    sx={{position: 'absolute', top: 8, right: 8, zIndex: 1}}
                    aria-label={t('adminPageLink')}
                    title={t('adminPageLink')}
                    size="large"
                    color="primary"
                >
                    <AdminPanelSettingsIcon fontSize="large" />
                </IconButton>
            )}

            <Grid container sx={{minHeight: '60vh', alignItems: 'center', justifyContent: 'center'}}>
                {workstationMachineReady && (
                    <Grid container spacing={3} sx={{maxWidth: 1100, justifyContent: 'center'}}>
                        <Grid item xs="auto" sx={{textAlign: 'center'}}>
                            <Button variant="contained" sx={homeButtonStyle} onClick={() => setPreModalOpen(true)}>
                                {t('production')}
                            </Button>
                        </Grid>
                        <Grid item xs="auto" sx={{textAlign: 'center'}}>
                            <Button href="/quality-info-steps" variant="contained" sx={homeButtonStyle}>
                                {t('qualityInfoStepsPage')}
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </Grid>

            <Dialog open={preModalOpen} onClose={() => setPreModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1}}>
                    {t('workStationPreconditionsTitle')}
                    <IconButton aria-label={t('close')} onClick={() => setPreModalOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingPreconditions && (
                        <Box sx={{display: 'flex', justifyContent: 'center', py: 3}}>
                            <CircularProgress size={36} />
                        </Box>
                    )}
                    {!loadingPreconditions && fetchErrorKey && (
                        <Typography color="error" variant="body2">
                            {t(fetchErrorKey)}
                        </Typography>
                    )}
                    {!loadingPreconditions && !fetchErrorKey && (
                        <List dense disablePadding>
                            {preconditionItems.map((item, index) => {
                                const text = preconditionText(item, lang);
                                if (!text) return null;
                                return (
                                    <ListItem
                                        key={index}
                                        secondaryAction={
                                            <CheckCircleIcon color="success" fontSize="small" aria-hidden />
                                        }
                                        sx={{'& .MuiListItemSecondaryAction-root': {right: 8}}}
                                    >
                                        <ListItemText primary={text} primaryTypographyProps={{variant: 'body2'}} />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button variant="outlined" onClick={() => setPreModalOpen(false)}>
                        {t('cancel')}
                    </Button>
                    <Button variant="contained" onClick={handleStartProduction} disabled={!canStartProduction}>
                        {t('startProduction')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
