import {type Dispatch, type ReactNode, type SetStateAction, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Backdrop from '@mui/material/Backdrop';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import {useTranslation} from 'react-i18next';
import {Server} from '../../api/Server.ts';
import type {
    MeasuringFeaturePrototypeTO,
    ProductionWorkOrderTO,
    QualityInfoStepTO,
    WorkSessionMeasuringFeatureInputTO,
    WorkSessionResponseTO,
    WorkstationMachineConfigTO,
} from '../../models/ApiRequests.ts';
import {isWorkOrderClosedForProduction} from './workOrderProductionHelpers.ts';

const STORAGE_SESSION = 'activeWorkSessionId';

function digitsOnly(v: string): string {
    return v.replace(/[^0-9]/g, '');
}

function qualityStepImageSrc(b64: string | undefined): string | undefined {
    if (!b64?.trim()) return undefined;
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

function technicalDrawingImageSrc(b64: string | undefined): string | undefined {
    if (!b64?.trim()) return undefined;
    return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
}

const controlProductDialogPaperSx = {
    width: 'min(1200px, 96vw)',
    maxWidth: '96vw',
    maxHeight: 'min(92vh, 920px)',
    minHeight: 'min(78vh, 680px)',
} as const;

function TechnicalDrawingColumn({base64}: {base64?: string}) {
    const {t} = useTranslation();
    const [zoomed, setZoomed] = useState(false);
    const src = technicalDrawingImageSrc(base64);
    return (
        <>
            <Box
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    height: '100%',
                    minHeight: {xs: 120, md: 280},
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="caption" color="text.secondary" sx={{alignSelf: 'flex-start', mb: 0.5}}>
                    {t('technicalDrawing')}
                </Typography>
                {src ? (
                    <Box
                        component="img"
                        src={src}
                        alt=""
                        onClick={() => setZoomed(true)}
                        sx={{
                            width: '100%',
                            flex: 1,
                            minHeight: {xs: 160, md: 200},
                            maxHeight: {xs: 280, md: 'min(58vh, 560px)'},
                            objectFit: 'contain',
                            cursor: 'zoom-in',
                            borderRadius: 0.5,
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{py: 2, textAlign: 'center'}}>
                        {t('technicalDrawingNone')}
                    </Typography>
                )}
            </Box>
            {src ? (
                <Backdrop
                    open={zoomed}
                    onClick={() => setZoomed(false)}
                    sx={(theme) => ({
                        zIndex: theme.zIndex.modal + 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    })}
                >
                    <Box
                        component="img"
                        src={src}
                        alt=""
                        onClick={() => setZoomed(false)}
                        sx={{
                            maxHeight: '100vh',
                            maxWidth: '100vw',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            cursor: 'zoom-out',
                            p: 1,
                            boxSizing: 'border-box',
                        }}
                    />
                </Backdrop>
            ) : null}
        </>
    );
}

function ControlProductModalBody({
    hint,
    prototypes,
    assessments,
    onAssessmentChange,
    technicalDrawingBase64,
}: {
    hint?: ReactNode;
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean
    ) => void;
    technicalDrawingBase64?: string;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: {xs: 'column', md: 'row'},
                gap: 2,
                alignItems: 'flex-start',
                minHeight: {md: 'min(68vh, 600px)'},
            }}
        >
            <Box sx={{flex: {md: '1 1 75%'}, minWidth: 0, width: {xs: '100%', md: '75%'}}}>
                {hint}
                <MeasuringFeaturesForm
                    prototypes={prototypes}
                    assessments={assessments}
                    onAssessmentChange={onAssessmentChange}
                />
            </Box>
            <Box
                sx={{
                    flex: {md: '0 0 25%'},
                    width: {xs: '100%', md: '25%'},
                    maxWidth: {xs: '100%', md: '25%'},
                    alignSelf: 'stretch',
                }}
            >
                <TechnicalDrawingColumn base64={technicalDrawingBase64} />
            </Box>
        </Box>
    );
}

function buildAssessmentsFromPrototypes(prototypes: MeasuringFeaturePrototypeTO[]): WorkSessionMeasuringFeatureInputTO[] {
    return prototypes.map((p) => {
        const checkType = p.checkType;
        if (checkType === 'MEASURED') {
            return {
                catalogueId: p.catalogueId,
                assessedValue: '',
                assessedValueGood: false,
            };
        }
        return {
            catalogueId: p.catalogueId,
            assessedValue: undefined,
            assessedValueGood: false,
        };
    });
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
    prototypes,
    assessments,
    onAssessmentChange,
}: {
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean
    ) => void;
}) {
    const {t} = useTranslation();
    return (
        <Stack spacing={2} sx={{mt: 1}}>
            {prototypes.map((proto, index) => {
                const assessment = assessments[index];
                const checkType = proto.checkType;
                const isMeasured = checkType === 'MEASURED';
                const isAttributive = checkType === 'ATTRIBUTIVE';
                const assessedValue = typeof assessment?.assessedValue === 'string' ? assessment.assessedValue : '';
                const assessedValueGood = Boolean(assessment?.assessedValueGood);

                return (
                    <Box
                        key={proto.catalogueId ?? index}
                        sx={{border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5}}
                    >
                        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="stretch">
                            {/* Column 1: catalogueID, class, frequency */}
                            <Box sx={{flex: 1, minWidth: 220}}>
                                <Typography variant="body2">
                                    {t('catalogueId')}: {proto.catalogueId ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('class')}: {proto.classType ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('frequency')}: {proto.frequency ?? '—'}
                                </Typography>
                            </Box>

                            {/* Column 2: toolType, measuring tool, absoluteMeasure checkmark */}
                            <Box sx={{flex: 1, minWidth: 240}}>
                                <Typography variant="body2">
                                    {t('toolType')}: {proto.toolType ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('measuringTool')}: {proto.measuringTool ?? '—'}
                                </Typography>
                                {proto.absoluteMeasure ? (
                                    <Typography variant="body2">
                                        {t('absoluteMeasure')}: ✓
                                    </Typography>
                                ) : null}
                            </Box>

                            {/* Column 3: MEASURED = ref/tolerances + assessed value; ATTRIBUTIVE = OK/NOK → assessedValueGood */}
                            <Box sx={{flex: 1, minWidth: 260}}>
                                {isMeasured ? (
                                    <>
                                        <Typography variant="body2">
                                            {t('refValue')}: {proto.refValue ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMin')}: {proto.minTolerance ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMax')}: {proto.maxTolerance ?? '—'}
                                        </Typography>
                                        <TextField
                                            label={t('assessedValue')}
                                            value={assessedValue}
                                            onChange={(e) =>
                                                onAssessmentChange(index, 'assessedValue', digitsOnly(e.target.value))
                                            }
                                            size="small"
                                            fullWidth
                                            inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                                            sx={{mt: 1}}
                                        />
                                    </>
                                ) : isAttributive ? (
                                    <FormControl sx={{mt: 0.5}} component="fieldset" variant="standard">
                                        <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                        <RadioGroup
                                            row
                                            value={assessedValueGood ? 'ok' : 'nok'}
                                            onChange={(e) =>
                                                onAssessmentChange(
                                                    index,
                                                    'assessedValueGood',
                                                    e.target.value === 'ok',
                                                )
                                            }
                                        >
                                            <FormControlLabel
                                                value="ok"
                                                control={<Radio size="small" />}
                                                label={t('ok')}
                                            />
                                            <FormControlLabel
                                                value="nok"
                                                control={<Radio size="small" />}
                                                label={t('nok')}
                                            />
                                        </RadioGroup>
                                    </FormControl>
                                ) : (
                                    <>
                                        <Typography variant="body2">
                                            {t('toleranceMin')}: {proto.minTolerance ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMax')}: {proto.maxTolerance ?? '—'}
                                        </Typography>
                                        <FormControlLabel
                                            sx={{mt: 0.5}}
                                            control={
                                                <Checkbox
                                                    checked={assessedValueGood}
                                                    onChange={(e) =>
                                                        onAssessmentChange(
                                                            index,
                                                            'assessedValueGood',
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                            }
                                            label={t('assessedValueGood')}
                                        />
                                    </>
                                )}
                            </Box>
                        </Stack>

                        {/* Description row underneath */}
                        <Box sx={{mt: 1}}>
                            <Typography variant="body2" color="text.secondary">
                                {t('description')}: {proto.description ?? '—'}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
}

export type ProductionWorkSessionPanelProps = {
    workOrder: ProductionWorkOrderTO;
    /** Called after session ended or aborted; parent should clear work order selection. */
    onClearSelection: () => void;
    /** Reload work orders from the server (e.g. after good counts may have updated on central). */
    onWorkOrdersRefresh?: () => Promise<void>;
    /**
     * When {@code true}, the production work order dropdown should be read-only (session opening or open).
     */
    onWorkOrderSelectorLockedChange?: (locked: boolean) => void;
};

export function ProductionWorkSessionPanel({
    workOrder,
    onClearSelection,
    onWorkOrdersRefresh,
    onWorkOrderSelectorLockedChange,
}: ProductionWorkSessionPanelProps) {
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

    const [rowsInitial, setRowsInitial] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);
    const [rowsControl, setRowsControl] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);

    const [faultyReason, setFaultyReason] = useState('');
    const [faultyCause, setFaultyCause] = useState('');
    const [faultyComment, setFaultyComment] = useState('');

    const [goodDelta, setGoodDelta] = useState('1');

    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [productionTargetReachedOpen, setProductionTargetReachedOpen] = useState(false);

    const [qualityInfoModalOpen, setQualityInfoModalOpen] = useState(false);
    const [qualityInfoSteps, setQualityInfoSteps] = useState<QualityInfoStepTO[]>([]);
    const [qualityInfoStepIndex, setQualityInfoStepIndex] = useState(0);

    const sessionIdRef = useRef<number | null>(null);
    const workOrderSelectorLockCbRef = useRef(onWorkOrderSelectorLockedChange);
    workOrderSelectorLockCbRef.current = onWorkOrderSelectorLockedChange;

    useEffect(() => {
        sessionIdRef.current = session?.id ?? null;
    }, [session?.id]);

    useEffect(() => {
        const woId = workOrder.id;
        if (woId == null) return;

        if (isWorkOrderClosedForProduction(workOrder)) {
            setOpeningSession(false);
            setOpenError(t('workOrderAlreadyComplete'));
            return;
        }

        let cancelled = false;
        workOrderSelectorLockCbRef.current?.(true);

        (async () => {
            setOpeningSession(true);
            setOpenError(null);
            setSession(null);
            setFirstControlDone(false);
            setInitialModalOpen(false);
            setRowsInitial([]);
            setRowsControl([]);
            setActionError(null);
            setQualityInfoModalOpen(false);
            setQualityInfoSteps([]);
            setQualityInfoStepIndex(0);
            try {
                const steps = await Server.getProductionWorkOrderQualityInfoSteps(woId);
                if (cancelled) return;
                if (!steps || steps.length === 0) {
                    setOpenError(t('qualityInfoStepsRequired'));
                    workOrderSelectorLockCbRef.current?.(false);
                    return;
                }
                const sorted = [...steps].sort(
                    (a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0),
                );
                setQualityInfoSteps(sorted);
                setQualityInfoStepIndex(0);
                setQualityInfoModalOpen(true);
            } catch (e) {
                if (!cancelled) {
                    setOpenError(extractError(e));
                    workOrderSelectorLockCbRef.current?.(false);
                }
            } finally {
                if (!cancelled) setOpeningSession(false);
            }
        })();

        return () => {
            cancelled = true;
            workOrderSelectorLockCbRef.current?.(false);
        };
    }, [workOrder.id]);

    const abortQualityInfoReview = () => {
        setQualityInfoModalOpen(false);
        setQualityInfoSteps([]);
        setQualityInfoStepIndex(0);
        workOrderSelectorLockCbRef.current?.(false);
        onClearSelection();
    };

    const completeQualityInfoAndOpenSession = async () => {
        const woId = workOrder.id;
        if (woId == null) return;
        setOpeningSession(true);
        setOpenError(null);
        try {
            let userQr: string | undefined;
            let userName: string | undefined;
            let userSurname: string | undefined;
            try {
                const rawUser = sessionStorage.getItem('userData');
                if (rawUser) {
                    const u = JSON.parse(rawUser) as {qrCode?: string; name?: string; surname?: string};
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
            setQualityInfoModalOpen(false);
            setQualityInfoSteps([]);
            setQualityInfoStepIndex(0);
            setSession(created);
            const prototypes = created.measuringFeaturePrototypes ?? [];
            setRowsInitial(buildAssessmentsFromPrototypes(prototypes));
            setRowsControl(buildAssessmentsFromPrototypes(prototypes));
            if (created.id != null) {
                sessionStorage.setItem(STORAGE_SESSION, String(created.id));
            }
            setInitialModalOpen(true);
        } catch (e) {
            const raw = extractError(e);
            if (raw === 'WORK_ORDER_COMPLETE') {
                setOpenError(t('workOrderAlreadyComplete'));
            } else if (
                raw === 'QUALITY_INFO_STEPS_REQUIRED' ||
                raw === 'PRODUCT_NOT_FOUND_FOR_WORK_ORDER'
            ) {
                setOpenError(t('qualityInfoStepsRequired'));
            } else {
                setOpenError(raw);
            }
            setQualityInfoModalOpen(false);
            workOrderSelectorLockCbRef.current?.(false);
        } finally {
            setOpeningSession(false);
        }
    };

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
    const sessionIsClosed = Boolean(session?.sessionEnd);

    const acknowledgeProductionTargetReached = async () => {
        setProductionTargetReachedOpen(false);
        sessionStorage.removeItem(STORAGE_SESSION);
        sessionStorage.removeItem('selectedWorkOrderId');
        sessionStorage.removeItem('selectedWorkOrder');
        sessionIdRef.current = null;
        workOrderSelectorLockCbRef.current?.(false);
        try {
            await onWorkOrdersRefresh?.();
        } catch {
            /* ignore */
        }
        onClearSelection();
    };

    const updateAssessment = (
        setAssessments: Dispatch<SetStateAction<WorkSessionMeasuringFeatureInputTO[]>>,
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean
    ) => {
        setAssessments((prev) => {
            const next = [...prev];
            next[index] = {
                ...(next[index] ?? {}),
                [field]: value,
            };
            return next;
        });
    };

    const handleSaveInitialControl = async () => {
        if (sessionId == null) return;
        const prototypes = session?.measuringFeaturePrototypes ?? [];
        if (prototypes.length === 0 || rowsInitial.length === 0) {
            setActionError(t('workSessionFirstControlRequired'));
            return;
        }

        const measuredMissing = prototypes.some((p, idx) => {
            if (p.checkType !== 'MEASURED') return false;
            const v = rowsInitial[idx]?.assessedValue ?? '';
            return digitsOnly(v).trim().length === 0;
        });
        if (measuredMissing) {
            setActionError(t('allFieldsRequired'));
            return;
        }

        const features: WorkSessionMeasuringFeatureInputTO[] = rowsInitial.map((a) => ({
            catalogueId: a.catalogueId ?? undefined,
            assessedValue: a.assessedValue?.trim() ? digitsOnly(a.assessedValue) : undefined,
            assessedValueGood: Boolean(a.assessedValueGood),
        }));

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
        const prototypes = session?.measuringFeaturePrototypes ?? [];
        if (prototypes.length === 0 || rowsControl.length === 0) {
            setActionError(t('workSessionControlFeaturesRequired'));
            return;
        }

        const measuredMissing = prototypes.some((p, idx) => {
            if (p.checkType !== 'MEASURED') return false;
            const v = rowsControl[idx]?.assessedValue ?? '';
            return digitsOnly(v).trim().length === 0;
        });
        if (measuredMissing) {
            setActionError(t('allFieldsRequired'));
            return;
        }

        const features: WorkSessionMeasuringFeatureInputTO[] = rowsControl.map((a) => ({
            catalogueId: a.catalogueId ?? undefined,
            assessedValue: a.assessedValue?.trim() ? digitsOnly(a.assessedValue) : undefined,
            assessedValueGood: Boolean(a.assessedValueGood),
        }));

        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionControlProduct(sessionId, {measuringFeatures: features});
            setSession(updated);
            setControlOpen(false);
            const prototypes2 = updated.measuringFeaturePrototypes ?? prototypes;
            setRowsControl(buildAssessmentsFromPrototypes(prototypes2));
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
            });
            setSession(updated);
            setGoodOpen(false);
            setGoodDelta('1');
            if (updated.workOrderCompletedByTarget) {
                setProductionTargetReachedOpen(true);
            }
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
            workOrderSelectorLockCbRef.current?.(false);
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
            workOrderSelectorLockCbRef.current?.(false);
            onClearSelection();
        }
    };

    const abortInitialSession = async () => {
        await endAndClearSelection();
    };

    return (
        <Box sx={{mt: 2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 1}}>
                {sessionId != null && !sessionIsClosed && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => void endAndClearSelection()}
                        disabled={submitting}
                        sx={{flexShrink: 0, borderWidth: 2}}
                    >
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

            {!openingSession && !openError && firstControlDone && !sessionIsClosed && (
                <Box sx={{mt: 2}}>
                    <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{
                            width: '100%',
                            flexWrap: 'nowrap',
                            overflowX: 'auto',
                            pb: 0.5,
                            '& .MuiButton-root': {
                                flex: '1 1 0',
                                minWidth: 0,
                                py: 1.2,
                                textTransform: 'none',
                            },
                        }}
                    >
                        <Button
                            size="medium"
                            variant="outlined"
                            color="inherit"
                            sx={{bgcolor: '#fafafa', color: 'text.primary', borderColor: 'divider'}}
                            onClick={() => {
                                setActionError(null);
                                setGoodOpen(true);
                            }}
                        >
                            {t('workSessionRecordGood')}
                        </Button>
                        <Button
                            size="medium"
                            variant="contained"
                            sx={{bgcolor: '#c62828', '&:hover': {bgcolor: '#b71c1c'}}}
                            onClick={() => {
                                setActionError(null);
                                setFaultyOpen(true);
                            }}
                        >
                            {t('workSessionDeclareFaulty')}
                        </Button>
                        <Button
                            size="medium"
                            variant="contained"
                            sx={{bgcolor: '#2e7d32', '&:hover': {bgcolor: '#1b5e20'}}}
                            onClick={() => {
                                setActionError(null);
                                setControlOpen(true);
                            }}
                        >
                            {t('workSessionRecordControl')}
                        </Button>
                        <Button
                            size="medium"
                            variant="contained"
                            sx={{bgcolor: '#6a1b9a', '&:hover': {bgcolor: '#4a148c'}}}
                            onClick={() => {
                                setActionError(null);
                                setToolOpen(true);
                            }}
                        >
                            {t('workSessionToolChange')}
                        </Button>
                    </Stack>
                </Box>
            )}

            <Dialog open={qualityInfoModalOpen} fullWidth maxWidth="md" disableEscapeKeyDown onClose={() => {}}>
                <DialogTitle>{t('qualityInfoReviewTitle')}</DialogTitle>
                <DialogContent>
                    {qualityInfoSteps.length > 0 && (
                        <Stack spacing={2} sx={{mt: 1}}>
                            <Typography variant="body2" color="text.secondary">
                                {t('qualityInfoStepOf', {
                                    current: qualityInfoStepIndex + 1,
                                    total: qualityInfoSteps.length,
                                })}
                            </Typography>
                            {(() => {
                                const step = qualityInfoSteps[qualityInfoStepIndex];
                                const src = qualityStepImageSrc(step?.imageDataBase64);
                                return (
                                    <>
                                        {src ? (
                                            <Box
                                                component="img"
                                                src={src}
                                                alt=""
                                                sx={{
                                                    width: '100%',
                                                    maxHeight: 360,
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {t('qualityInfoNoImage')}
                                            </Typography>
                                        )}
                                        <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>
                                            {step?.stepDescription?.trim() ? step.stepDescription : '—'}
                                        </Typography>
                                    </>
                                );
                            })()}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{flexWrap: 'wrap', gap: 1}}>
                    <Button onClick={() => void abortQualityInfoReview()} color="inherit" disabled={openingSession}>
                        {t('workSessionAbortSession')}
                    </Button>
                    <Box sx={{flexGrow: 1}} />
                    {qualityInfoStepIndex > 0 && (
                        <Button onClick={() => setQualityInfoStepIndex((i) => i - 1)} disabled={openingSession}>
                            {t('previous')}
                        </Button>
                    )}
                    {qualityInfoStepIndex < qualityInfoSteps.length - 1 && (
                        <Button
                            variant="contained"
                            onClick={() => setQualityInfoStepIndex((i) => i + 1)}
                            disabled={openingSession}
                        >
                            {t('next')}
                        </Button>
                    )}
                    {qualityInfoStepIndex === qualityInfoSteps.length - 1 && qualityInfoSteps.length > 0 && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => void completeQualityInfoAndOpenSession()}
                            disabled={openingSession}
                        >
                            {t('startProduction')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={initialModalOpen}
                fullWidth
                maxWidth={false}
                disableEscapeKeyDown
                PaperProps={{sx: controlProductDialogPaperSx}}
            >
                <DialogTitle>{t('workSessionMandatoryFirstControl')}</DialogTitle>
                <DialogContent dividers sx={{overflow: 'auto'}}>
                    <ControlProductModalBody
                        hint={
                            <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                                {t('workSessionMandatoryFirstControlHint')}
                            </Typography>
                        }
                        prototypes={session?.measuringFeaturePrototypes ?? []}
                        assessments={rowsInitial}
                        onAssessmentChange={(i, field, value) =>
                            updateAssessment(setRowsInitial, i, field, value)
                        }
                        technicalDrawingBase64={session?.technicalDrawingBase64}
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

            <Dialog
                open={controlOpen}
                onClose={() => setControlOpen(false)}
                fullWidth
                maxWidth={false}
                PaperProps={{sx: controlProductDialogPaperSx}}
            >
                <DialogTitle>{t('workSessionRecordControl')}</DialogTitle>
                <DialogContent dividers sx={{overflow: 'auto'}}>
                    <ControlProductModalBody
                        prototypes={session?.measuringFeaturePrototypes ?? []}
                        assessments={rowsControl}
                        onAssessmentChange={(i, field, value) =>
                            updateAssessment(setRowsControl, i, field, value)
                        }
                        technicalDrawingBase64={session?.technicalDrawingBase64}
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

            <Dialog open={productionTargetReachedOpen} onClose={() => void acknowledgeProductionTargetReached()}>
                <DialogTitle>{t('workOrderProductionTargetReachedTitle')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{mt: 1}}>
                        {t('workOrderProductionTargetReachedBody')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => void acknowledgeProductionTargetReached()} variant="contained">
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
    const residualOverOrder =
        required != null && required > 0 && producedWo > required ? producedWo - required : 0;
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
            {residualOverOrder > 0 && (
                <Alert severity="info" sx={{mt: 1.5}} variant="outlined">
                    <Typography variant="body2" component="span">
                        {t('workOrderOverproductionResidualStock', {count: residualOverOrder})}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{mt: 0.75}}>
                        {t('workOrderStockHandlingTbd')}
                    </Typography>
                </Alert>
            )}
        </Box>
    );
}
