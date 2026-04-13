import {useEffect, useMemo, useState} from 'react';
import {Box, CircularProgress, Grid, Paper, Typography} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import {Client} from '@stomp/stompjs';
import {SOCKET_URL, Server, normalizeBinaryDataUrl} from 'sf-common';
import type {MachineTO} from 'sf-common/src/models/ApiRequests';
import {useTranslation} from 'react-i18next';

type MonitoringClientEventTO = {
    eventType?: string;
    machineId?: number;
    machineName?: string;
    workSessionId?: number;
    workOrderId?: number;
    goodProductsCount?: number;
    details?: string;
    timestamp?: string;
};

function parseTimestampMs(value?: string): number | null {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function minutesAgoLabel(nowMs: number, eventTimestamp: string | undefined, t: (k: string, o?: any) => string): string {
    const ts = parseTimestampMs(eventTimestamp);
    if (ts == null) return t('none');
    const deltaMin = Math.max(0, Math.floor((nowMs - ts) / 60000));
    if (deltaMin <= 0) return t('justNow');
    return t('beforeMinutes', {minutes: deltaMin});
}

export function MonitoringClientPanel() {
    const {t} = useTranslation();
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);
    const [latestByMachineId, setLatestByMachineId] = useState<Record<number, MonitoringClientEventTO>>({});

    useEffect(() => {
        setLoading(true);
        Server.getAllMachines(
            (response: {data?: MachineTO[]}) => {
                const list = Array.isArray(response?.data) ? response.data : [];
                setMachines(list);
                setLoading(false);
            },
            () => {
                setMachines([]);
                setLoading(false);
            },
        );
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setTick((v) => v + 1), 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const stomp = new Client({
            brokerURL: SOCKET_URL,
            reconnectDelay: 2000,
            onConnect: () => {
                stomp.subscribe('/websocket/monitoring-events', (raw) => {
                    const ev = JSON.parse(raw.body ?? '{}') as MonitoringClientEventTO;
                    if (ev.machineId == null) return;
                    setLatestByMachineId((prev) => ({...prev, [ev.machineId as number]: ev}));
                });
            },
        });
        stomp.activate();
        return () => {
            stomp.deactivate();
        };
    }, []);

    const nowMs = useMemo(() => Date.now(), [tick, latestByMachineId]);

    return (
        <Box sx={{mt: 3}}>
            <Typography variant="h6" sx={{mb: 2}}>
                {t('monitoringClient')}
            </Typography>
            {loading ? (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {machines.map((machine) => {
                        const ev = machine.id != null ? latestByMachineId[machine.id] : undefined;
                        const imageUrl = machine.machineImageBase64
                            ? normalizeBinaryDataUrl(machine.machineImageBase64)
                            : undefined;
                        const eventKey = ev?.eventType ? `monitoringEvent_${ev.eventType}` : 'none';
                        return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={machine.id ?? machine.machineName}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        borderRadius: 3,
                                        minHeight: 220,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            display: 'grid',
                                            placeItems: 'center',
                                            bgcolor: 'action.hover',
                                        }}
                                    >
                                        {imageUrl ? (
                                            <Box component="img" alt="" src={imageUrl} sx={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                        ) : (
                                            <PrecisionManufacturingIcon color="action" />
                                        )}
                                    </Box>
                                    <Typography variant="subtitle1" sx={{fontWeight: 700}}>
                                        {machine.machineName ?? t('machine')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('monitoringLastEvent')}: {t(eventKey)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {minutesAgoLabel(nowMs, ev?.timestamp, t)}
                                    </Typography>
                                    {ev?.details ? (
                                        <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                                            {ev.details}
                                        </Typography>
                                    ) : null}
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}
