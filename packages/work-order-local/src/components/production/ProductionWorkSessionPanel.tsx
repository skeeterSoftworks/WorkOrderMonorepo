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
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
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
    SetupDataPrototypeTO,
    WorkSessionMeasuringFeatureInputTO,
    WorkSessionResponseTO,
    WorkSessionSetupProductCreateTO,
    WorkstationMachineConfigTO,
    WorkStationPreconditionItem,
} from '../../models/ApiRequests.ts';
import {isWorkOrderClosedForProduction} from './workOrderProductionHelpers.ts';
import {filterDecimalNumericInput, parseDecimalNumericInputToNumber} from '../../util/decimalNumericInput.ts';

const STORAGE_SESSION = 'activeWorkSessionId';

function preconditionText(item: WorkStationPreconditionItem, lang: 'sr' | 'en'): string {
    if (lang === 'sr') {
        return (item.sr || item.en || '').trim();
    }
    return (item.en || item.sr || '').trim();
}

function assessedMeasuredValueForApi(raw: string | undefined): string | undefined {
    const n = parseDecimalNumericInputToNumber(raw ?? '');
    return n === undefined ? undefined : String(n);
}

/** Parsed measured value vs prototype absolute [minTolerance, maxTolerance]; no icon if bounds missing or input incomplete. */
function measuredValueToleranceHint(
    assessedRaw: string,
    minTol: number | undefined | null,
    maxTol: number | undefined | null,
): 'in' | 'out' | 'none' {
    const parsed = parseDecimalNumericInputToNumber(assessedRaw);
    if (parsed === undefined) {
        return 'none';
    }
    if (minTol == null || maxTol == null) {
        return 'none';
    }
    if (!Number.isFinite(minTol) || !Number.isFinite(maxTol) || minTol > maxTol) {
        return 'none';
    }
    if (parsed >= minTol && parsed <= maxTol) {
        return 'in';
    }
    return 'out';
}

function formatSetupProtoNumber(n: number | undefined | null): string {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return String(n);
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

/** True when every MEASURED feature has a non-empty digit assessed value (same rule as saving a control product). */
function areControlAssessmentsComplete(
    prototypes: MeasuringFeaturePrototypeTO[],
    rows: WorkSessionMeasuringFeatureInputTO[],
): boolean {
    if (prototypes.length === 0 || rows.length === 0) return false;
    return !prototypes.some((p, idx) => {
        if (p.checkType !== 'MEASURED') return false;
        const v = rows[idx]?.assessedValue ?? '';
        return parseDecimalNumericInputToNumber(v) === undefined;
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
                const rangeHint = isMeasured
                    ? measuredValueToleranceHint(assessedValue, proto.minTolerance, proto.maxTolerance)
                    : 'none';

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

                            {/* Column 2: toolType, measuring tool */}
                            <Box sx={{flex: 1, minWidth: 240}}>
                                <Typography variant="body2">
                                    {t('toolType')}: {proto.toolType ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('measuringTool')}: {proto.measuringTool ?? '—'}
                                </Typography>
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
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{mt: 1}}>
                                            <TextField
                                                label={t('assessedValue')}
                                                value={assessedValue}
                                                onChange={(e) =>
                                                    onAssessmentChange(
                                                        index,
                                                        'assessedValue',
                                                        filterDecimalNumericInput(e.target.value),
                                                    )
                                                }
                                                size="small"
                                                fullWidth
                                                inputProps={{inputMode: 'decimal'}}
                                                sx={{flex: 1, minWidth: 0}}
                                            />
                                            {rangeHint === 'in' ? (
                                                <Tooltip title={t('measuredValueInTolerance')}>
                                                    <CheckCircleIcon
                                                        color="success"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueInTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : rangeHint === 'out' ? (
                                                <Tooltip title={t('measuredValueOutOfTolerance')}>
                                                    <CancelIcon
                                                        color="error"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueOutOfTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : null}
                                        </Stack>
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
    const {t, i18n} = useTranslation();
    const lang: 'sr' | 'en' = i18n.language?.toLowerCase().startsWith('sr') ? 'sr' : 'en';

    const [openingSession, setOpeningSession] = useState(true);
    const [openError, setOpenError] = useState<string | null>(null);
    const [session, setSession] = useState<WorkSessionResponseTO | null>(null);

    const [initialModalOpen, setInitialModalOpen] = useState(false);
    const [firstControlDone, setFirstControlDone] = useState(false);

    const [faultyOpen, setFaultyOpen] = useState(false);
    const [controlOpen, setControlOpen] = useState(false);
    const [toolOpen, setToolOpen] = useState(false);
    const [setupModalProto, setSetupModalProto] = useState<SetupDataPrototypeTO | null>(null);
    const [setupModalLoading, setSetupModalLoading] = useState(false);
    const [setupHeightMeasured, setSetupHeightMeasured] = useState('');
    const [setupHeightOkNok, setSetupHeightOkNok] = useState<'ok' | 'nok'>('ok');
    const [setupDiamMeasured, setSetupDiamMeasured] = useState('');
    const [setupDiamOkNok, setSetupDiamOkNok] = useState<'ok' | 'nok'>('ok');
    const [goodOpen, setGoodOpen] = useState(false);

    const [rowsInitial, setRowsInitial] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);
    const [rowsControl, setRowsControl] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);

    const [faultyReason, setFaultyReason] = useState('');
    const [faultyCause, setFaultyCause] = useState('');
    const [faultyComment, setFaultyComment] = useState('');
    const [rejectCauseOptions, setRejectCauseOptions] = useState<string[]>([]);

    const [goodDelta, setGoodDelta] = useState('1');

    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [productionTargetReachedOpen, setProductionTargetReachedOpen] = useState(false);

    const [qualityInfoModalOpen, setQualityInfoModalOpen] = useState(false);
    const [qualityInfoSteps, setQualityInfoSteps] = useState<QualityInfoStepTO[]>([]);
    const [qualityInfoStepIndex, setQualityInfoStepIndex] = useState(0);

    const [workStationPreconditionsOpen, setWorkStationPreconditionsOpen] = useState(false);
    const [preconditionItems, setPreconditionItems] = useState<WorkStationPreconditionItem[]>([]);
    const [loadingPreconditions, setLoadingPreconditions] = useState(false);
    const [preconditionsFetchErrorKey, setPreconditionsFetchErrorKey] = useState<string | null>(null);

    const sessionIdRef = useRef<number | null>(null);
    const workOrderSelectorLockCbRef = useRef(onWorkOrderSelectorLockedChange);
    workOrderSelectorLockCbRef.current = onWorkOrderSelectorLockedChange;

    useEffect(() => {
        sessionIdRef.current = session?.id ?? null;
    }, [session?.id]);

    useEffect(() => {
        Server.getSelectOptions(
            (resp: {data?: {rejectCauses?: string[]}}) => {
                const list = resp?.data?.rejectCauses;
                if (Array.isArray(list)) {
                    setRejectCauseOptions(list);
                }
            },
            () => {},
        );
    }, []);

    useEffect(() => {
        if (!workStationPreconditionsOpen) {
            setPreconditionItems([]);
            setPreconditionsFetchErrorKey(null);
            setLoadingPreconditions(false);
            return;
        }

        setLoadingPreconditions(true);
        setPreconditionsFetchErrorKey(null);
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
                        setPreconditionsFetchErrorKey('preconditionsParseError');
                        setPreconditionItems([]);
                    } else {
                        setPreconditionItems(arr);
                    }
                } catch {
                    setPreconditionsFetchErrorKey('preconditionsParseError');
                    setPreconditionItems([]);
                }
                setLoadingPreconditions(false);
            },
            () => {
                setLoadingPreconditions(false);
                setPreconditionsFetchErrorKey('preconditionsLoadError');
            },
        );
    }, [workStationPreconditionsOpen]);

    useEffect(() => {
        if (!toolOpen) {
            setSetupModalProto(null);
            setSetupModalLoading(false);
            return;
        }
        setSetupHeightMeasured('');
        setSetupDiamMeasured('');
        setSetupHeightOkNok('ok');
        setSetupDiamOkNok('ok');
        const ref = workOrder.productReference?.trim();
        if (!ref) {
            setSetupModalProto(null);
            return;
        }
        let cancelled = false;
        setSetupModalLoading(true);
        setSetupModalProto(null);
        void Server.getBoundMachineProducts()
            .then((products) => {
                if (cancelled) return;
                const match = products.find((p) => (p.reference ?? '').trim() === ref);
                setSetupModalProto(match?.setupDataPrototype ?? null);
            })
            .catch(() => {
                if (!cancelled) setSetupModalProto(null);
            })
            .finally(() => {
                if (!cancelled) setSetupModalLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [toolOpen, workOrder.productReference]);

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
    const recordControlAssessmentsComplete = areControlAssessmentsComplete(
        session?.measuringFeaturePrototypes ?? [],
        rowsControl,
    );
    const initialControlAssessmentsComplete = areControlAssessmentsComplete(
        session?.measuringFeaturePrototypes ?? [],
        rowsInitial,
    );

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

        if (!areControlAssessmentsComplete(prototypes, rowsInitial)) {
            setActionError(t('allFieldsRequired'));
            return;
        }

        const features: WorkSessionMeasuringFeatureInputTO[] = rowsInitial.map((a) => ({
            catalogueId: a.catalogueId ?? undefined,
            assessedValue: assessedMeasuredValueForApi(a.assessedValue),
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

        if (!areControlAssessmentsComplete(prototypes, rowsControl)) {
            setActionError(t('allFieldsRequired'));
            return;
        }

        const features: WorkSessionMeasuringFeatureInputTO[] = rowsControl.map((a) => ({
            catalogueId: a.catalogueId ?? undefined,
            assessedValue: assessedMeasuredValueForApi(a.assessedValue),
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

    const handleRecordSetup = async () => {
        if (sessionId == null) return;
        const proto = setupModalProto;
        const body: WorkSessionSetupProductCreateTO = {};
        if (proto) {
            if (proto.attributiveHeightMeasurement) {
                body.measuredHeightOk = setupHeightOkNok === 'ok';
            } else {
                const hv = parseDecimalNumericInputToNumber(setupHeightMeasured);
                if (hv === undefined) {
                    setActionError(t('workSessionSetupHeightRequired'));
                    return;
                }
                body.measuredHeight = String(hv);
            }
            if (proto.attributiveDiameterMeasurement) {
                body.measuredDiameterOk = setupDiamOkNok === 'ok';
            } else {
                const dv = parseDecimalNumericInputToNumber(setupDiamMeasured);
                if (dv === undefined) {
                    setActionError(t('workSessionSetupDiameterRequired'));
                    return;
                }
                body.measuredDiameter = String(dv);
            }
        }
        const hasPayload =
            body.measuredHeight != null ||
            body.measuredHeightOk != null ||
            body.measuredDiameter != null ||
            body.measuredDiameterOk != null;
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionSetupProduct(sessionId, hasPayload ? body : null);
            setSession(updated);
            setToolOpen(false);
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

    const setupMeasuredHeightRangeHint =
        setupModalProto != null && !setupModalProto.attributiveHeightMeasurement
            ? measuredValueToleranceHint(
                  setupHeightMeasured,
                  setupModalProto.heightMaxNegTolerance,
                  setupModalProto.heightMaxPosTolerance,
              )
            : 'none';

    const setupMeasuredDiameterRangeHint =
        setupModalProto != null && !setupModalProto.attributiveDiameterMeasurement
            ? measuredValueToleranceHint(
                  setupDiamMeasured,
                  setupModalProto.diameterMaxNegTolerance,
                  setupModalProto.diameterMaxPosTolerance,
              )
            : 'none';

    return (
        <Box sx={{mt: 2}}>
            <Stack spacing={1} sx={{mb: 1}}>
                {sessionId != null && !sessionIsClosed && (
                    <Stack direction="row" justifyContent="flex-start" alignItems="center">
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => setWorkStationPreconditionsOpen(true)}
                            disabled={submitting}
                            sx={{flexShrink: 0}}
                        >
                            {t('workSessionShowPreconditions')}
                        </Button>
                    </Stack>
                )}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
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

            <Dialog
                open={workStationPreconditionsOpen}
                onClose={() => setWorkStationPreconditionsOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1}}>
                    {t('workStationPreconditionsTitle')}
                    <IconButton
                        aria-label={t('close')}
                        onClick={() => setWorkStationPreconditionsOpen(false)}
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingPreconditions && (
                        <Box sx={{display: 'flex', justifyContent: 'center', py: 3}}>
                            <CircularProgress size={36} />
                        </Box>
                    )}
                    {!loadingPreconditions && preconditionsFetchErrorKey && (
                        <Typography color="error" variant="body2">
                            {t(preconditionsFetchErrorKey)}
                        </Typography>
                    )}
                    {!loadingPreconditions && !preconditionsFetchErrorKey && (
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
                    <Button variant="outlined" color="primary" onClick={() => setWorkStationPreconditionsOpen(false)}>
                        {t('close')}
                    </Button>
                </DialogActions>
            </Dialog>

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
                    <Button
                        onClick={() => void handleSaveInitialControl()}
                        variant="contained"
                        disabled={submitting || !initialControlAssessmentsComplete}
                    >
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={faultyOpen} onClose={() => setFaultyOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{t('workSessionDeclareFaulty')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{mt: 1}}>
                        <TextField label={t('reason')} value={faultyReason} onChange={(e) => setFaultyReason(e.target.value)} fullWidth />
                        <TextField
                            select
                            label={t('workSessionRejectCause')}
                            value={faultyCause}
                            onChange={(e) => setFaultyCause(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {(() => {
                                const opts = [...rejectCauseOptions];
                                if (faultyCause && !opts.includes(faultyCause)) {
                                    opts.push(faultyCause);
                                }
                                return opts.map((cause) => (
                                    <MenuItem key={cause} value={cause}>
                                        {cause}
                                    </MenuItem>
                                ));
                            })()}
                        </TextField>
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
                onClose={(_, reason) => {
                    if (!recordControlAssessmentsComplete) {
                        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                            setActionError(t('allFieldsRequired'));
                        }
                        return;
                    }
                    setControlOpen(false);
                    setActionError(null);
                }}
                disableEscapeKeyDown={!recordControlAssessmentsComplete}
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
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                            setControlOpen(false);
                            setActionError(null);
                        }}
                        disabled={submitting || !recordControlAssessmentsComplete}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleSaveOnDemandControl()}
                        variant="contained"
                        disabled={submitting || !recordControlAssessmentsComplete}
                    >
                        {t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={toolOpen}
                onClose={() => !submitting && setToolOpen(false)}
                fullWidth
                maxWidth="md"
                scroll="paper"
            >
                <DialogTitle>{t('workSessionToolChange')}</DialogTitle>
                <DialogContent dividers sx={{overflow: 'auto'}}>
                    {setupModalLoading ? (
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{py: 2}}>
                            <CircularProgress size={22} />
                            <Typography variant="body2" color="text.secondary">
                                {t('workSessionSetupLoading')}
                            </Typography>
                        </Stack>
                    ) : (
                        <Stack spacing={2} sx={{mt: 0.5}}>
                            <Typography variant="body2" color="text.secondary">
                                {t('workSessionSetupFormHint')}
                            </Typography>
                            <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="flex-start">
                                <Box sx={{flex: 1, minWidth: {md: 160}}}>
                                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                        {t('operation')}
                                    </Typography>
                                    <Typography variant="body2">{setupModalProto?.operationID?.trim() || '—'}</Typography>
                                    <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{mt: 1.5}}>
                                        {t('workSessionSetupToolId')}
                                    </Typography>
                                    <Typography variant="body2">{setupModalProto?.toolID?.trim() || '—'}</Typography>
                                </Box>

                                <Box sx={{flex: 1, minWidth: 0, width: '100%'}}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {t('heightMeasurement')}
                                    </Typography>
                                    {!setupModalProto ? (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('workSessionSetupNoPrototype')}
                                        </Typography>
                                    ) : setupModalProto.attributiveHeightMeasurement ? (
                                        <FormControl component="fieldset" variant="standard" sx={{mt: 0.5}}>
                                            <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                            <RadioGroup
                                                row
                                                value={setupHeightOkNok}
                                                onChange={(e) =>
                                                    setSetupHeightOkNok(e.target.value === 'ok' ? 'ok' : 'nok')
                                                }
                                            >
                                                <FormControlLabel value="ok" control={<Radio size="small" />} label={t('ok')} />
                                                <FormControlLabel value="nok" control={<Radio size="small" />} label={t('nok')} />
                                            </RadioGroup>
                                        </FormControl>
                                    ) : (
                                        <Stack spacing={1} sx={{mt: 0.5}}>
                                            <Typography variant="body2">
                                                {t('refHeight')}: {formatSetupProtoNumber(setupModalProto.heightRefValue)}
                                            </Typography>
                                            <Typography variant="body2">
                                                {t('heightMaxNegTolerance')}:{' '}
                                                {formatSetupProtoNumber(setupModalProto.heightMaxNegTolerance)}
                                            </Typography>
                                            <Typography variant="body2">
                                                {t('heightMaxPosTolerance')}:{' '}
                                                {formatSetupProtoNumber(setupModalProto.heightMaxPosTolerance)}
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <TextField
                                                    label={t('workSessionSetupMeasuredValue')}
                                                    value={setupHeightMeasured}
                                                    onChange={(e) =>
                                                        setSetupHeightMeasured(
                                                            filterDecimalNumericInput(e.target.value),
                                                        )
                                                    }
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{inputMode: 'decimal'}}
                                                    sx={{flex: 1, minWidth: 0}}
                                                />
                                                {setupMeasuredHeightRangeHint === 'in' ? (
                                                    <Tooltip title={t('measuredValueInTolerance')}>
                                                        <CheckCircleIcon
                                                            color="success"
                                                            fontSize="medium"
                                                            sx={{flexShrink: 0}}
                                                            aria-label={t('measuredValueInTolerance')}
                                                        />
                                                    </Tooltip>
                                                ) : setupMeasuredHeightRangeHint === 'out' ? (
                                                    <Tooltip title={t('measuredValueOutOfTolerance')}>
                                                        <CancelIcon
                                                            color="error"
                                                            fontSize="medium"
                                                            sx={{flexShrink: 0}}
                                                            aria-label={t('measuredValueOutOfTolerance')}
                                                        />
                                                    </Tooltip>
                                                ) : null}
                                            </Stack>
                                        </Stack>
                                    )}
                                </Box>

                                <Box sx={{flex: 1, minWidth: 0, width: '100%'}}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {t('diameterMeasurement')}
                                    </Typography>
                                    {!setupModalProto ? (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('workSessionSetupNoPrototype')}
                                        </Typography>
                                    ) : setupModalProto.attributiveDiameterMeasurement ? (
                                        <FormControl component="fieldset" variant="standard" sx={{mt: 0.5}}>
                                            <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                            <RadioGroup
                                                row
                                                value={setupDiamOkNok}
                                                onChange={(e) =>
                                                    setSetupDiamOkNok(e.target.value === 'ok' ? 'ok' : 'nok')
                                                }
                                            >
                                                <FormControlLabel value="ok" control={<Radio size="small" />} label={t('ok')} />
                                                <FormControlLabel value="nok" control={<Radio size="small" />} label={t('nok')} />
                                            </RadioGroup>
                                        </FormControl>
                                    ) : (
                                        <Stack spacing={1} sx={{mt: 0.5}}>
                                            <Typography variant="body2">
                                                {t('refDiameter')}: {formatSetupProtoNumber(setupModalProto.diameterRefValue)}
                                            </Typography>
                                            <Typography variant="body2">
                                                {t('diameterMaxNegTolerance')}:{' '}
                                                {formatSetupProtoNumber(setupModalProto.diameterMaxNegTolerance)}
                                            </Typography>
                                            <Typography variant="body2">
                                                {t('diameterMaxPosTolerance')}:{' '}
                                                {formatSetupProtoNumber(setupModalProto.diameterMaxPosTolerance)}
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <TextField
                                                    label={t('workSessionSetupMeasuredValue')}
                                                    value={setupDiamMeasured}
                                                    onChange={(e) =>
                                                        setSetupDiamMeasured(filterDecimalNumericInput(e.target.value))
                                                    }
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{inputMode: 'decimal'}}
                                                    sx={{flex: 1, minWidth: 0}}
                                                />
                                                {setupMeasuredDiameterRangeHint === 'in' ? (
                                                    <Tooltip title={t('measuredValueInTolerance')}>
                                                        <CheckCircleIcon
                                                            color="success"
                                                            fontSize="medium"
                                                            sx={{flexShrink: 0}}
                                                            aria-label={t('measuredValueInTolerance')}
                                                        />
                                                    </Tooltip>
                                                ) : setupMeasuredDiameterRangeHint === 'out' ? (
                                                    <Tooltip title={t('measuredValueOutOfTolerance')}>
                                                        <CancelIcon
                                                            color="error"
                                                            fontSize="medium"
                                                            sx={{flexShrink: 0}}
                                                            aria-label={t('measuredValueOutOfTolerance')}
                                                        />
                                                    </Tooltip>
                                                ) : null}
                                            </Stack>
                                        </Stack>
                                    )}
                                </Box>
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToolOpen(false)} disabled={submitting}>
                        {t('cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleRecordSetup()}
                        variant="contained"
                        disabled={submitting || setupModalLoading}
                    >
                        {t('workSessionRecordSetup')}
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
            <Stack
                direction={{xs: 'column', sm: 'row'}}
                spacing={2}
                alignItems={{xs: 'stretch', sm: 'flex-start'}}
                sx={{width: '100%'}}
            >
                <Box sx={{flex: '1 1 0', minWidth: 0}}>
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
                </Box>
                <Stack
                    spacing={0.75}
                    sx={{
                        flex: {sm: '0 0 auto'},
                        minWidth: {sm: 200},
                        pl: {sm: 2},
                        ml: {sm: 0},
                        borderLeft: {sm: 1},
                        borderTop: {xs: 1, sm: 0},
                        borderColor: 'divider',
                        pt: {xs: 2, sm: 0},
                        mt: {xs: 0, sm: 0},
                    }}
                >
                    <Typography variant="body2">
                        {t('productionWorkSessionControlCount')}: {session.controlProductCount ?? 0}
                    </Typography>
                    <Typography variant="body2">
                        {t('productionWorkSessionFaultyCount')}: {session.faultyProductCount ?? 0}
                    </Typography>
                    <Typography variant="body2">
                        {t('productionWorkSessionSetupCount')}: {session.setupProductCount ?? 0}
                    </Typography>
                </Stack>
            </Stack>
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
