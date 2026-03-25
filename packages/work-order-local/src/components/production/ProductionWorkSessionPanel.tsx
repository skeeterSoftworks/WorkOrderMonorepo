import {useEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {useTranslation} from 'react-i18next';
import {Server} from '../../api/Server.ts';
import type {
    ProductionWorkOrderTO,
    WorkSessionMeasuringFeatureInputTO,
    WorkSessionResponseTO,
    WorkstationMachineConfigTO,
} from '../../models/ApiRequests.ts';

const STORAGE_SESSION = 'activeWorkSessionId';

type MeasuringRow = {
    featureName: string;
    width: string;
    height: string;
    depth: string;
    diameter: string;
};

function emptyRow(): MeasuringRow {
    return {featureName: '', width: '', height: '', depth: '', diameter: ''};
}

function parseOptionalLong(s: string): number | null | undefined {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (!Number.isFinite(n)) return undefined;
    return Math.trunc(n);
}

function rowsToMeasuringFeatures(rows: MeasuringRow[]): WorkSessionMeasuringFeatureInputTO[] {
    return rows
        .filter((r) => r.featureName.trim().length > 0)
        .map((r) => ({
            featureName: r.featureName.trim(),
            width: parseOptionalLong(r.width) ?? null,
            height: parseOptionalLong(r.height) ?? null,
            depth: parseOptionalLong(r.depth) ?? null,
            diameter: parseOptionalLong(r.diameter) ?? null,
        }));
}

function extractError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        if (typeof d === 'string' && d.length > 0) return d;
        return err.message;
    }
    return String(err);
}

function MeasuringFeaturesForm({
    rows,
    onChange,
    onAddRow,
    onRemoveRow,
}: {
    rows: MeasuringRow[];
    onChange: (index: number, field: keyof MeasuringRow, value: string) => void;
    onAddRow: () => void;
    onRemoveRow: (index: number) => void;
}) {
    const {t} = useTranslation();
    return (
        <Stack spacing={2} sx={{mt: 1}}>
            {rows.map((row, index) => (
                <Box key={index} sx={{border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5}}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 1}}>
                        <Typography variant="subtitle2">{t('workSessionMeasuringSample', {index: index + 1})}</Typography>
                        {rows.length > 1 && (
                            <IconButton size="small" onClick={() => onRemoveRow(index)} aria-label={t('removeRow')}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                    <TextField
                        fullWidth
                        size="small"
                        label={t('featureName')}
                        value={row.featureName}
                        onChange={(e) => onChange(index, 'featureName', e.target.value)}
                        sx={{mb: 1}}
                    />
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1}>
                        <TextField
                            size="small"
                            label={t('width')}
                            value={row.width}
                            onChange={(e) => onChange(index, 'width', e.target.value)}
                        />
                        <TextField
                            size="small"
                            label={t('height')}
                            value={row.height}
                            onChange={(e) => onChange(index, 'height', e.target.value)}
                        />
                        <TextField
                            size="small"
                            label={t('depth')}
                            value={row.depth}
                            onChange={(e) => onChange(index, 'depth', e.target.value)}
                        />
                        <TextField
                            size="small"
                            label={t('diameter')}
                            value={row.diameter}
                            onChange={(e) => onChange(index, 'diameter', e.target.value)}
                        />
                    </Stack>
                </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={onAddRow} size="small" variant="outlined">
                {t('addMeasuringRow')}
            </Button>
        </Stack>
    );
}

export type ProductionWorkSessionPanelProps = {
    workOrder: ProductionWorkOrderTO;
    /** Called after session ended or aborted; parent should clear work order selection. */
    onClearSelection: () => void;
    /** Reload work orders from the server (e.g. after good counts may have updated on central). */
    onWorkOrdersRefresh?: () => Promise<void>;
};

export function ProductionWorkSessionPanel({workOrder, onClearSelection, onWorkOrdersRefresh}: ProductionWorkSessionPanelProps) {
    const {t} = useTranslation();

    const [openingSession, setOpeningSession] = useState(true);
    const [openError, setOpenError] = useState<string | null>(null);
    const [session, setSession] = useState<WorkSessionResponseTO | null>(null);

    const [initialModalOpen, setInitialModalOpen] = useState(false);
    const [firstControlDone, setFirstControlDone] = useState(false);

    const [faultyOpen, setFaultyOpen] = useState(false);
    const [controlOpen, setControlOpen] = useState(false);
    const [toolOpen, setToolOpen] = useState(false);
    const [goodOpen, setGoodOpen] = useState(false);

    const [rowsInitial, setRowsInitial] = useState<MeasuringRow[]>([emptyRow()]);
    const [rowsControl, setRowsControl] = useState<MeasuringRow[]>([emptyRow()]);

    const [faultyReason, setFaultyReason] = useState('');
    const [faultyCause, setFaultyCause] = useState('');
    const [faultyComment, setFaultyComment] = useState('');

    const [goodDelta, setGoodDelta] = useState('1');
    const [goodRef, setGoodRef] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const sessionIdRef = useRef<number | null>(null);

    useEffect(() => {
        sessionIdRef.current = session?.id ?? null;
    }, [session?.id]);

    useEffect(() => {
        const woId = workOrder.id;
        if (woId == null) return;

        let cancelled = false;

        (async () => {
            setOpeningSession(true);
            setOpenError(null);
            setSession(null);
            setFirstControlDone(false);
            setInitialModalOpen(false);
            setRowsInitial([emptyRow()]);
            setRowsControl([emptyRow()]);
            setActionError(null);
            try {
                let userQr: string | undefined;
                let userName: string | undefined;
                let userSurname: string | undefined;
                try {
                    const raw = sessionStorage.getItem('userData');
                    if (raw) {
                        const u = JSON.parse(raw) as {qrCode?: string; name?: string; surname?: string};
                        userQr = u.qrCode;
                        userName = u.name;
                        userSurname = u.surname;
                    }
                } catch {
                    /* ignore */
                }

                let stationId = '';
                try {
                    const cfg = await new Promise<WorkstationMachineConfigTO>((resolve, reject) => {
                        Server.getWorkstationMachine(
                            (response: {data: WorkstationMachineConfigTO}) => resolve(response.data),
                            reject
                        );
                    });
                    stationId = cfg?.machineName?.trim() || '';
                } catch {
                    stationId = '';
                }

                const created = await Server.openProductionWorkSession({
                    workOrderId: woId,
                    operatorQrCode: userQr,
                    operatorName: userName,
                    operatorSurname: userSurname,
                    stationId: stationId || undefined,
                });
                if (cancelled) return;
                setSession(created);
                if (created.id != null) {
                    sessionStorage.setItem(STORAGE_SESSION, String(created.id));
                }
                setInitialModalOpen(true);
            } catch (e) {
                if (!cancelled) setOpenError(extractError(e));
            } finally {
                if (!cancelled) setOpeningSession(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [workOrder.id]);

    useEffect(() => {
        return () => {
            const id = sessionIdRef.current;
            if (id != null) {
                void Server.endProductionWorkSession(id).catch(() => {});
            }
            sessionStorage.removeItem(STORAGE_SESSION);
        };
    }, []);

    const sessionId = session?.id;

    const updateRow = (setRows: Dispatch<SetStateAction<MeasuringRow[]>>, index: number, field: keyof MeasuringRow, value: string) => {
        setRows((prev) => {
            const next = [...prev];
            next[index] = {...next[index], [field]: value};
            return next;
        });
    };

    const handleSaveInitialControl = async () => {
        if (sessionId == null) return;
        const features = rowsToMeasuringFeatures(rowsInitial);
        if (features.length === 0) {
            setActionError(t('workSessionFirstControlRequired'));
            return;
        }
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionControlProduct(sessionId, {measuringFeatures: features});
            setSession(updated);
            setInitialModalOpen(false);
            setFirstControlDone(true);
        } catch (e) {
            setActionError(extractError(e));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveOnDemandControl = async () => {
        if (sessionId == null) return;
        const features = rowsToMeasuringFeatures(rowsControl);
        if (features.length === 0) {
            setActionError(t('workSessionControlFeaturesRequired'));
            return;
        }
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionControlProduct(sessionId, {measuringFeatures: features});
            setSession(updated);
            setControlOpen(false);
            setRowsControl([emptyRow()]);
        } catch (e) {
            setActionError(extractError(e));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveFaulty = async () => {
        if (sessionId == null) return;
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionFaultyProduct(sessionId, {
                rejectReason: faultyReason || undefined,
                rejectCause: faultyCause || undefined,
                rejectComment: faultyComment || undefined,
            });
            setSession(updated);
            setFaultyOpen(false);
            setFaultyReason('');
            setFaultyCause('');
            setFaultyComment('');
        } catch (e) {
            setActionError(extractError(e));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveGood = async () => {
        if (sessionId == null) return;
        const n = Number(goodDelta.trim());
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
            setActionError(t('workSessionGoodDeltaInvalid'));
            return;
        }
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionGoodDelta(sessionId, {
                delta: n,
                productReferenceID: goodRef.trim() || undefined,
            });
            setSession(updated);
            setGoodOpen(false);
            setGoodDelta('1');
            setGoodRef('');
            if (onWorkOrdersRefresh) {
                try {
                    await onWorkOrdersRefresh();
                } catch {
                    /* ignore refresh errors */
                }
            }
        } catch (e) {
            setActionError(extractError(e));
        } finally {
            setSubmitting(false);
        }
    };

    const endAndClearSelection = async () => {
        if (sessionId == null) {
            sessionStorage.removeItem(STORAGE_SESSION);
            onClearSelection();
            return;
        }
        setSubmitting(true);
        try {
            await Server.endProductionWorkSession(sessionId);
        } catch {
            /* still clear */
        } finally {
            sessionStorage.removeItem(STORAGE_SESSION);
            sessionStorage.removeItem('selectedWorkOrderId');
            sessionStorage.removeItem('selectedWorkOrder');
            setSubmitting(false);
            sessionIdRef.current = null;
            onClearSelection();
        }
    };

    const abortInitialSession = async () => {
        await endAndClearSelection();
    };

    return (
        <Box sx={{mt: 2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 1}}>
                {sessionId != null && (
                    <Button size="small" onClick={() => void endAndClearSelection()} disabled={submitting}>
                        {t('workSessionEnd')}
                    </Button>
                )}
            </Stack>

            {openingSession && (
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{py: 1}}>
                    <CircularProgress size={22} />
                    <Typography variant="body2" color="text.secondary">
                        {t('workSessionOpening')}
                    </Typography>
                </Stack>
            )}

            {!openingSession && openError && (
                <Stack spacing={1} sx={{py: 1}}>
                    <Typography color="error" variant="body2">
                        {openError}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => onClearSelection()}>
                        {t('productionClearWorkOrderSelection')}
                    </Button>
                </Stack>
            )}

            {!openingSession && !openError && session && (
                <Stack spacing={2}>
                    <SessionSummary workOrder={workOrder} session={session} />
                    {actionError && (
                        <Typography color="error" variant="body2">
                            {actionError}
                        </Typography>
                    )}
                </Stack>
            )}

            {!openingSession && !openError && firstControlDone && (
                <Box sx={{mt: 2}}>
                    <Typography variant="subtitle2" sx={{mb: 1.5}}>
                        {t('workSessionProcessingPanel')}
                    </Typography>
                    <Stack spacing={1.5}>
                        <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            sx={{bgcolor: '#c62828', '&:hover': {bgcolor: '#b71c1c'}, py: 1.5}}
                            onClick={() => {
                                setActionError(null);
                                setFaultyOpen(true);
                            }}
                        >
                            {t('workSessionDeclareFaulty')}
                        </Button>
                        <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            sx={{bgcolor: '#2e7d32', '&:hover': {bgcolor: '#1b5e20'}, py: 1.5}}
                            onClick={() => {
                                setActionError(null);
                                setControlOpen(true);
                            }}
                        >
                            {t('workSessionRecordControl')}
                        </Button>
                        <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            sx={{bgcolor: '#6a1b9a', '&:hover': {bgcolor: '#4a148c'}, py: 1.5}}
                            onClick={() => {
                                setActionError(null);
                                setToolOpen(true);
                            }}
                        >
                            {t('workSessionToolChange')}
                        </Button>
                        <Button
                            fullWidth
                            size="large"
                            variant="outlined"
                            color="inherit"
                            sx={{bgcolor: '#fafafa', color: 'text.primary', borderColor: 'divider', py: 1.5}}
                            onClick={() => {
                                setActionError(null);
                                setGoodOpen(true);
                            }}
                        >
                            {t('workSessionRecordGood')}
                        </Button>
                    </Stack>
                </Box>
            )}

            <Dialog open={initialModalOpen} fullWidth maxWidth="md" disableEscapeKeyDown>
                <DialogTitle>{t('workSessionMandatoryFirstControl')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                        {t('workSessionMandatoryFirstControlHint')}
                    </Typography>
                    <MeasuringFeaturesForm
                        rows={rowsInitial}
                        onChange={(i, f, v) => updateRow(setRowsInitial, i, f, v)}
                        onAddRow={() => setRowsInitial((r) => [...r, emptyRow()])}
                        onRemoveRow={(i) => setRowsInitial((r) => r.filter((_, j) => j !== i))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => void abortInitialSession()} color="inherit" disabled={submitting}>
                        {t('workSessionAbortSession')}
                    </Button>
                    <Button onClick={() => void handleSaveInitialControl()} variant="contained" disabled={submitting}>
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={faultyOpen} onClose={() => setFaultyOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{t('workSessionDeclareFaulty')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{mt: 1}}>
                        <TextField label={t('reason')} value={faultyReason} onChange={(e) => setFaultyReason(e.target.value)} fullWidth />
                        <TextField label={t('workSessionRejectCause')} value={faultyCause} onChange={(e) => setFaultyCause(e.target.value)} fullWidth />
                        <TextField
                            label={t('comment')}
                            value={faultyComment}
                            onChange={(e) => setFaultyComment(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFaultyOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={() => void handleSaveFaulty()} variant="contained" disabled={submitting}>
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={controlOpen} onClose={() => setControlOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>{t('workSessionRecordControl')}</DialogTitle>
                <DialogContent>
                    <MeasuringFeaturesForm
                        rows={rowsControl}
                        onChange={(i, f, v) => updateRow(setRowsControl, i, f, v)}
                        onAddRow={() => setRowsControl((r) => [...r, emptyRow()])}
                        onRemoveRow={(i) => setRowsControl((r) => r.filter((_, j) => j !== i))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setControlOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={() => void handleSaveOnDemandControl()} variant="contained" disabled={submitting}>
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={toolOpen} onClose={() => setToolOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{t('workSessionToolChange')}</DialogTitle>
                <DialogContent>
                    <Typography sx={{mt: 1}} color="text.secondary">
                        {t('workSessionToolChangeTbd')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToolOpen(false)} variant="contained">
                        {t('close')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={goodOpen} onClose={() => setGoodOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{t('workSessionRecordGood')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{mt: 1}}>
                        <TextField
                            label={t('workSessionGoodCountDelta')}
                            type="number"
                            inputProps={{min: 1, step: 1}}
                            value={goodDelta}
                            onChange={(e) => setGoodDelta(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label={t('productReferenceID')}
                            value={goodRef}
                            onChange={(e) => setGoodRef(e.target.value)}
                            fullWidth
                        />
                        <Typography variant="caption" color="text.secondary">
                            {t('workSessionGoodFlushHint')}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGoodOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={() => void handleSaveGood()} variant="contained" disabled={submitting}>
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function SessionSummary({workOrder, session}: {workOrder: ProductionWorkOrderTO; session: WorkSessionResponseTO}) {
    const {t} = useTranslation();
    const required = workOrder.requiredQuantity;
    const producedWo = workOrder.producedGoodQuantity ?? 0;
    const sessionGood = session.productCount ?? 0;
    return (
        <Box sx={{p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
            {required != null && (
                <Typography variant="body2">
                    {t('productionWorkOrderRequiredQuantity')}: {required}
                </Typography>
            )}
            <Typography variant="body2">
                {t('productionWorkOrderProducedGood')}: {producedWo}
            </Typography>
            <Typography variant="body2">
                {t('productionWorkSessionGoodRecorded')}: {sessionGood}
            </Typography>
            {session.productReferenceID && (
                <Typography variant="body2" sx={{mt: 0.5}}>
                    {t('productReferenceID')}: {session.productReferenceID}
                </Typography>
            )}
            <Divider sx={{my: 1}} />
        </Box>
    );
}
