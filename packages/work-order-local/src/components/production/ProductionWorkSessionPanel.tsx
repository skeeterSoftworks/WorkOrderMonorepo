import {type Dispatch, type SetStateAction, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {Server} from '../../api/Server';
import {DeclareFaultyProductDialog} from '../../modals/DeclareFaultyProductDialog';
import {HelpRequestDialog} from '../../modals/HelpRequestDialog';
import {InitialControlProductDialog} from '../../modals/InitialControlProductDialog';
import {ProductionTargetReachedDialog} from '../../modals/ProductionTargetReachedDialog';
import {QualityInfoReviewDialog} from '../../modals/QualityInfoReviewDialog';
import {RecordControlProductDialog} from '../../modals/RecordControlProductDialog';
import {RecordGoodProductsDialog} from '../../modals/RecordGoodProductsDialog';
import {ResolveHelpDialog} from '../../modals/ResolveHelpDialog';
import {ToolChangeSetupDialog} from '../../modals/ToolChangeSetupDialog';
import {ProcessTechnologyDialog} from '../../modals/ProcessTechnologyDialog';
import {ProductionPerformanceDialog} from '../../modals/ProductionPerformanceDialog';
import {CloseWorkSessionConfirmDialog} from '../../modals/CloseWorkSessionConfirmDialog';
import {workSessionProcessButtonSx} from '../../modals/workSessionDialogStyles';
import {assessedMeasuredValueForApi, measuredValueToleranceHint} from '../../modals/workSessionMeasuringHelpers';
import type {
    BoundMachineTechnologyTO,
    MeasuringFeaturePrototypeTO,
    ProductionWorkOrderTO,
    QualityInfoStepTO,
    SetupDataPrototypeTO,
    WorkSessionMeasuringFeatureInputTO,
    WorkSessionResponseTO,
    WorkSessionSetupProductCreateTO,
    WorkstationMachineConfigTO,
} from '../../models/ApiRequests.ts';
import {isWorkOrderClosedForProduction} from './workOrderProductionHelpers';
import {parseDecimalNumericInputToNumber} from '../../util/decimalNumericInput';

const STORAGE_SESSION = 'activeWorkSessionId';

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

function isMeasuredControlNok(
    proto: MeasuringFeaturePrototypeTO,
    row: WorkSessionMeasuringFeatureInputTO | undefined,
): boolean {
    if (proto.checkType !== 'MEASURED') return false;
    const v = row?.assessedValue ?? '';
    return measuredValueToleranceHint(v, proto.minTolerance, proto.maxTolerance) === 'out';
}

function isNonMeasuredControlNok(
    proto: MeasuringFeaturePrototypeTO,
    row: WorkSessionMeasuringFeatureInputTO | undefined,
): boolean {
    if (proto.checkType === 'MEASURED') return false;
    return !Boolean(row?.assessedValueGood);
}

/** Non-empty summary when any feature is NOK (out of tolerance or not OK); otherwise null. */
function buildControlNokRejectReason(
    prototypes: MeasuringFeaturePrototypeTO[],
    rows: WorkSessionMeasuringFeatureInputTO[],
    t: TFunction,
): string | null {
    const parts: string[] = [];
    prototypes.forEach((p, idx) => {
        const row = rows[idx];
        if (isMeasuredControlNok(p, row)) {
            const v = row?.assessedValue ?? '';
            const parsed = parseDecimalNumericInputToNumber(v);
            const measuredStr = parsed !== undefined ? String(parsed) : v.trim() || '—';
            const minStr =
                p.minTolerance != null && Number.isFinite(Number(p.minTolerance)) ? String(p.minTolerance) : '—';
            const maxStr =
                p.maxTolerance != null && Number.isFinite(Number(p.maxTolerance)) ? String(p.maxTolerance) : '—';
            parts.push(
                t('workSessionControlRejectReasonMeasured', {
                    measured: measuredStr,
                    min: minStr,
                    max: maxStr,
                }),
            );
        } else if (isNonMeasuredControlNok(p, row)) {
            parts.push(
                t('workSessionControlRejectReasonFeatureNok', {
                    catalogueId: String(p.catalogueId ?? '—'),
                    verdict: t('nok'),
                }),
            );
        }
    });
    return parts.length > 0 ? parts.join('; ') : null;
}

function extractError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        if (typeof d === 'string' && d.length > 0) return d;
        return err.message;
    }
    return String(err);
}

/** Central returns this when the session was auto-closed (e.g. order quantity reached) and a further good-delta is sent. */
function isWorkSessionAlreadyEndedError(err: unknown): boolean {
    return extractError(err).includes('WORK_SESSION_ALREADY_ENDED');
}

function sessionIndicatesWorkOrderCompletedTarget(updated: WorkSessionResponseTO): boolean {
    if (updated.workOrderCompletedByTarget) {
        return true;
    }
    const end = updated.sessionEnd as unknown;
    if (end == null) {
        return false;
    }
    if (typeof end === 'string') {
        return end.trim().length > 0;
    }
    if (Array.isArray(end)) {
        return end.length > 0;
    }
    return false;
}

function parseSessionStart(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
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
    /** When {@code true}, an open work session is active (not ended); parent may hide global production chrome. */
    onActiveWorkSessionChange?: (active: boolean) => void;
};

export function ProductionWorkSessionPanel({
    workOrder,
    onClearSelection,
    onWorkOrdersRefresh,
    onWorkOrderSelectorLockedChange,
    onActiveWorkSessionChange,
}: ProductionWorkSessionPanelProps) {
    const {t} = useTranslation();

    const [openingSession, setOpeningSession] = useState(true);
    const [openError, setOpenError] = useState<string | null>(null);
    const [session, setSession] = useState<WorkSessionResponseTO | null>(null);

    const [initialModalOpen, setInitialModalOpen] = useState(false);
    const [firstControlDone, setFirstControlDone] = useState(false);

    const [faultyOpen, setFaultyOpen] = useState(false);
    /** When opening the reject modal from a control save, cancel reopens this dialog. */
    const faultyModalReturnToControlRef = useRef<'initial' | 'ondemand' | null>(null);
    const [controlOpen, setControlOpen] = useState(false);
    const [toolOpen, setToolOpen] = useState(false);
    const [processOpen, setProcessOpen] = useState(false);
    const [processLoading, setProcessLoading] = useState(false);
    const [processTechnology, setProcessTechnology] = useState<BoundMachineTechnologyTO | null>(null);
    const [performanceOpen, setPerformanceOpen] = useState(false);
    const [performanceLoading, setPerformanceLoading] = useState(false);
    const [performanceNorm100, setPerformanceNorm100] = useState<number | null>(null);
    const [setupModalProto, setSetupModalProto] = useState<SetupDataPrototypeTO | null>(null);
    const [setupModalLoading, setSetupModalLoading] = useState(false);
    const [setupHeightMeasured, setSetupHeightMeasured] = useState('');
    const [setupHeightOkNok, setSetupHeightOkNok] = useState<'ok' | 'nok'>('ok');
    const [setupDiamMeasured, setSetupDiamMeasured] = useState('');
    const [setupDiamOkNok, setSetupDiamOkNok] = useState<'ok' | 'nok'>('ok');
    const [goodOpen, setGoodOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [helpDetails, setHelpDetails] = useState('');
    const [helpRequested, setHelpRequested] = useState(false);
    const [resolveHelpOpen, setResolveHelpOpen] = useState(false);
    const [resolveAdminQr, setResolveAdminQr] = useState('');

    const [rowsInitial, setRowsInitial] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);
    const [rowsControl, setRowsControl] = useState<WorkSessionMeasuringFeatureInputTO[]>([]);

    const [faultyReason, setFaultyReason] = useState('');
    const [faultyCause, setFaultyCause] = useState('');
    const [faultyComment, setFaultyComment] = useState('');
    const [rejectCauseOptions, setRejectCauseOptions] = useState<string[]>([]);

    const [goodDelta, setGoodDelta] = useState('1');
    const [controlGoodDelta, setControlGoodDelta] = useState('');
    const [controlDialogIntervalMinutes, setControlDialogIntervalMinutes] = useState(0);
    const [controlBlockingMode, setControlBlockingMode] = useState(false);
    const [lastControlRecordedAt, setLastControlRecordedAt] = useState<number | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [productionTargetReachedOpen, setProductionTargetReachedOpen] = useState(false);
    const [closeSessionConfirmOpen, setCloseSessionConfirmOpen] = useState(false);

    const [qualityInfoModalOpen, setQualityInfoModalOpen] = useState(false);
    const [qualityInfoSteps, setQualityInfoSteps] = useState<QualityInfoStepTO[]>([]);
    const [qualityInfoStepIndex, setQualityInfoStepIndex] = useState(0);

    const sessionIdRef = useRef<number | null>(null);
    const workOrderSelectorLockCbRef = useRef(onWorkOrderSelectorLockedChange);
    workOrderSelectorLockCbRef.current = onWorkOrderSelectorLockedChange;
    const onActiveWorkSessionChangeRef = useRef(onActiveWorkSessionChange);
    onActiveWorkSessionChangeRef.current = onActiveWorkSessionChange;

    useEffect(() => {
        sessionIdRef.current = session?.id ?? null;
    }, [session?.id]);

    useEffect(() => {
        const active = Boolean(session && !session.sessionEnd);
        onActiveWorkSessionChangeRef.current?.(active);
    }, [session]);

    useEffect(() => {
        return () => {
            onActiveWorkSessionChangeRef.current?.(false);
        };
    }, []);

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
        let cancelled = false;
        void Server.getProductionWorkSessionConfig()
            .then((cfg) => {
                if (cancelled) return;
                const n = Number(cfg?.controlDialogIntervalMinutes ?? 0);
                setControlDialogIntervalMinutes(Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0);
            })
            .catch(() => {
                if (!cancelled) setControlDialogIntervalMinutes(0);
            });
        return () => {
            cancelled = true;
        };
    }, []);

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
        if (!processOpen) {
            setProcessTechnology(null);
            setProcessLoading(false);
            return;
        }
        const ref = workOrder.productReference?.trim();
        if (!ref) {
            setProcessTechnology(null);
            setProcessLoading(false);
            return;
        }
        let cancelled = false;
        setProcessLoading(true);
        setProcessTechnology(null);
        void Server.getBoundMachineProducts()
            .then((products) => {
                if (cancelled) return;
                const match = products.find((p) => (p.reference ?? '').trim() === ref);
                setProcessTechnology(match?.technologyData ?? null);
            })
            .catch(() => {
                if (!cancelled) setProcessTechnology(null);
            })
            .finally(() => {
                if (!cancelled) setProcessLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [processOpen, workOrder.productReference]);

    useEffect(() => {
        if (!performanceOpen) {
            setPerformanceNorm100(null);
            setPerformanceLoading(false);
            return;
        }
        const ref = workOrder.productReference?.trim();
        if (!ref) {
            setPerformanceNorm100(null);
            setPerformanceLoading(false);
            return;
        }
        let cancelled = false;
        setPerformanceLoading(true);
        setPerformanceNorm100(null);
        void Server.getBoundMachineProducts()
            .then((products) => {
                if (cancelled) return;
                const match = products.find((p) => (p.reference ?? '').trim() === ref);
                const n = match?.technologyData?.norm100;
                setPerformanceNorm100(n != null && Number.isFinite(Number(n)) ? Number(n) : null);
            })
            .catch(() => {
                if (!cancelled) setPerformanceNorm100(null);
            })
            .finally(() => {
                if (!cancelled) setPerformanceLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [performanceOpen, workOrder.productReference]);

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
            setControlGoodDelta('');
            setControlBlockingMode(false);
            setLastControlRecordedAt(null);
            setHelpOpen(false);
            setHelpDetails('');
            setHelpRequested(false);
            setResolveHelpOpen(false);
            setResolveAdminQr('');
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
                void Server.endProductionWorkSession(id, true).catch(() => {});
            }
            sessionStorage.removeItem(STORAGE_SESSION);
        };
    }, []);

    const sessionId = session?.id;
    const sessionIsClosed = Boolean(session?.sessionEnd);
    const sessionStartDate = parseSessionStart(session?.sessionStart);
    const elapsedDurationMinutes =
        sessionStartDate == null
            ? 0
            : Math.max(0, Math.floor((Date.now() - sessionStartDate.getTime()) / 60_000));
    const durationHours = Math.floor(elapsedDurationMinutes / 60);
    const durationRemainingMinutes = elapsedDurationMinutes % 60;
    const sessionStartDisplay =
        sessionStartDate == null
            ? t('workSessionCloseStartedAtUnknown')
            : sessionStartDate.toLocaleString();
    const sessionDurationDisplay = t('workSessionCloseDurationValue', {
        hours: durationHours,
        minutes: durationRemainingMinutes,
    });
    const recordControlAssessmentsComplete = areControlAssessmentsComplete(
        session?.measuringFeaturePrototypes ?? [],
        rowsControl,
    );
    const initialControlAssessmentsComplete = areControlAssessmentsComplete(
        session?.measuringFeaturePrototypes ?? [],
        rowsInitial,
    );
    const sessionPrototypes = session?.measuringFeaturePrototypes ?? [];
    const showInitialFaultyProductWarning =
        initialControlAssessmentsComplete &&
        buildControlNokRejectReason(sessionPrototypes, rowsInitial, t) !== null;
    const showRecordFaultyProductWarning =
        recordControlAssessmentsComplete &&
        buildControlNokRejectReason(sessionPrototypes, rowsControl, t) !== null;

    useEffect(() => {
        if (!firstControlDone || sessionIsClosed || sessionId == null) {
            return;
        }
        if (controlDialogIntervalMinutes <= 0 || lastControlRecordedAt == null) {
            return;
        }
        const intervalMs = controlDialogIntervalMinutes * 60_000;
        const remainingMs = intervalMs - (Date.now() - lastControlRecordedAt);
        const isAnotherModalOpen =
            initialModalOpen ||
            faultyOpen ||
            toolOpen ||
            processOpen ||
            performanceOpen ||
            goodOpen ||
            helpOpen ||
            qualityInfoModalOpen;
        const timeout = window.setTimeout(
            () => {
                if (isAnotherModalOpen || controlOpen || sessionIsClosed) {
                    return;
                }
                setActionError(null);
                setControlBlockingMode(true);
                setControlGoodDelta('');
                setControlOpen(true);
            },
            Math.max(0, remainingMs),
        );
        return () => {
            window.clearTimeout(timeout);
        };
    }, [
        firstControlDone,
        sessionIsClosed,
        sessionId,
        controlDialogIntervalMinutes,
        lastControlRecordedAt,
        initialModalOpen,
        faultyOpen,
        toolOpen,
        processOpen,
        performanceOpen,
        goodOpen,
        helpOpen,
        qualityInfoModalOpen,
        controlOpen,
    ]);

    const continueAfterProductionTargetReached = async () => {
        setProductionTargetReachedOpen(false);
        workOrderSelectorLockCbRef.current?.(false);
        try {
            await onWorkOrdersRefresh?.();
        } catch {
            /* ignore */
        }
    };

    const closeSessionAfterProductionTargetReached = async () => {
        setProductionTargetReachedOpen(false);
        await endAndClearSelection();
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

        const nokReason = buildControlNokRejectReason(prototypes, rowsInitial, t);
        if (nokReason) {
            faultyModalReturnToControlRef.current = 'initial';
            setFaultyReason(nokReason);
            setFaultyCause('');
            setFaultyComment('');
            setInitialModalOpen(false);
            setFaultyOpen(true);
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
            setLastControlRecordedAt(Date.now());
            if (sessionIndicatesWorkOrderCompletedTarget(updated)) {
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
            const msg = extractError(e);
            if (msg.includes('OPERATOR_NOT_FOUND') || msg.includes('404') || msg.includes('NOT_FOUND')) {
                setActionError(t('msg_userWithScannedQrNotExist'));
            } else {
                setActionError(msg);
            }
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

        const nokReason = buildControlNokRejectReason(prototypes, rowsControl, t);
        if (nokReason) {
            faultyModalReturnToControlRef.current = 'ondemand';
            setFaultyReason(nokReason);
            setFaultyCause('');
            setFaultyComment('');
            setControlOpen(false);
            setFaultyOpen(true);
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
            if (controlBlockingMode) {
                const raw = controlGoodDelta.trim();
                const parsed = Number(raw);
                if (raw.length === 0 || !Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
                    setActionError(t('workSessionGoodDeltaNonNegativeInvalid'));
                    return;
                }
                if (parsed > 0) {
                    const updatedGood = await Server.postProductionGoodDelta(sessionId, {delta: parsed});
                    setSession(updatedGood);
                    if (sessionIndicatesWorkOrderCompletedTarget(updatedGood)) {
                        setControlOpen(false);
                        setControlBlockingMode(false);
                        setControlGoodDelta('');
                        setProductionTargetReachedOpen(true);
                        if (onWorkOrdersRefresh) {
                            try {
                                await onWorkOrdersRefresh();
                            } catch {
                                /* ignore refresh errors */
                            }
                        }
                        return;
                    }
                }
            }
            const updated = await Server.postProductionControlProduct(sessionId, {measuringFeatures: features});
            setSession(updated);
            setControlOpen(false);
            setControlBlockingMode(false);
            setControlGoodDelta('');
            const prototypes2 = updated.measuringFeaturePrototypes ?? prototypes;
            setRowsControl(buildAssessmentsFromPrototypes(prototypes2));
            setLastControlRecordedAt(Date.now());
            if (sessionIndicatesWorkOrderCompletedTarget(updated)) {
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

    const closeFaultyModalReopenControlIfNeeded = () => {
        const returnTo = faultyModalReturnToControlRef.current;
        faultyModalReturnToControlRef.current = null;
        setFaultyOpen(false);
        setFaultyReason('');
        setFaultyCause('');
        setFaultyComment('');
        if (returnTo === 'initial') {
            setInitialModalOpen(true);
        } else if (returnTo === 'ondemand') {
            setControlOpen(true);
        }
    };

    const handleSaveFaulty = async () => {
        if (sessionId == null) return;
        const reopenControlKind = faultyModalReturnToControlRef.current;
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await Server.postProductionFaultyProduct(sessionId, {
                rejectReason: faultyReason || undefined,
                rejectCause: faultyCause || undefined,
                rejectComment: faultyComment || undefined,
            });
            setSession(updated);
            faultyModalReturnToControlRef.current = null;
            setFaultyOpen(false);
            setFaultyReason('');
            setFaultyCause('');
            setFaultyComment('');

            const protos =
                updated.measuringFeaturePrototypes ??
                session?.measuringFeaturePrototypes ??
                [];
            if (reopenControlKind === 'initial') {
                setRowsInitial(buildAssessmentsFromPrototypes(protos));
                setInitialModalOpen(true);
            } else if (reopenControlKind === 'ondemand') {
                setRowsControl(buildAssessmentsFromPrototypes(protos));
                setControlOpen(true);
            }
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
            if (sessionIndicatesWorkOrderCompletedTarget(updated)) {
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
            if (isWorkSessionAlreadyEndedError(e)) {
                setActionError(null);
                setGoodOpen(false);
                setGoodDelta('1');
                setProductionTargetReachedOpen(true);
                if (onWorkOrdersRefresh) {
                    try {
                        await onWorkOrdersRefresh();
                    } catch {
                        /* ignore refresh errors */
                    }
                }
            } else {
                setActionError(extractError(e));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const openHelpModal = () => {
        setActionError(null);
        setHelpDetails('');
        setHelpOpen(true);
    };

    const submitHelpDetails = async () => {
        if (sessionId == null) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await Server.postProductionHelpRequired(sessionId, {details: helpDetails.trim() || undefined});
            setHelpOpen(false);
            setHelpDetails('');
            setHelpRequested(true);
        } catch (e) {
            setActionError(extractError(e));
        } finally {
            setSubmitting(false);
        }
    };

    const openResolveHelpModal = () => {
        setActionError(null);
        setResolveAdminQr('');
        setResolveHelpOpen(true);
    };

    const closeResolveHelpModal = () => {
        setResolveHelpOpen(false);
        setResolveAdminQr('');
    };

    const resolveHelpWithAdminAuth = async () => {
        if (sessionId == null) return;
        const adminQr = resolveAdminQr.trim();
        if (!adminQr) {
            setActionError(t('typeUserIdOrScanPersonalQr'));
            return;
        }
        setSubmitting(true);
        setActionError(null);
        try {
            const admin = await new Promise<{role?: string}>((resolve, reject) => {
                Server.fetchOperatorData(
                    adminQr,
                    (response: {data?: {role?: string}}) => {
                        if (response?.data) {
                            resolve(response.data);
                        } else {
                            reject(new Error('OPERATOR_NOT_FOUND'));
                        }
                    },
                    reject,
                );
            });
            if (admin.role !== 'ADMIN') {
                setActionError(t('helpResolveAdminOnly'));
                return;
            }
            await Server.postProductionHelpResolved(sessionId);
            setHelpRequested(false);
            closeResolveHelpModal();
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
            setCloseSessionConfirmOpen(false);
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

    const processProductHint = [workOrder.productReference?.trim(), workOrder.productName?.trim()]
        .filter(Boolean)
        .join(' · ');

    return (
        <Box sx={{mt: 0, width: '100%', maxWidth: '100%'}}>
            {sessionId != null && !sessionIsClosed && (
                <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1} sx={{mb: 1}}>
                    <Button
                        size="small"
                        variant="outlined"
                        color={helpRequested ? 'success' : 'warning'}
                        onClick={() => {
                            if (helpRequested) {
                                openResolveHelpModal();
                            } else {
                                openHelpModal();
                            }
                        }}
                        disabled={submitting}
                        sx={{flexShrink: 0, borderWidth: 2}}
                    >
                        {helpRequested ? t('resolveHelp') : t('helpNeeded')}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                            setActionError(null);
                            setCloseSessionConfirmOpen(true);
                        }}
                        disabled={submitting}
                        sx={{flexShrink: 0, borderWidth: 2}}
                    >
                        {t('workSessionEnd')}
                    </Button>
                </Stack>
            )}

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
                    {sessionIsClosed &&
                        (session.workOrderCompletedByTarget ||
                            isWorkOrderClosedForProduction(workOrder)) && (
                            <Alert severity="info" variant="outlined" sx={{mt: 0.5}}>
                                <Typography variant="body2">
                                    {t('workOrderCompleteSessionEndedSummaryHint')}
                                </Typography>
                            </Alert>
                        )}
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
                                faultyModalReturnToControlRef.current = null;
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
                                setControlBlockingMode(false);
                                setControlGoodDelta('');
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
                        <Button
                            size="medium"
                            variant="outlined"
                            color="inherit"
                            sx={workSessionProcessButtonSx}
                            onClick={() => {
                                setActionError(null);
                                setProcessOpen(true);
                            }}
                        >
                            {t('workSessionProcess')}
                        </Button>
                        <Button
                            size="medium"
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                                setActionError(null);
                                setPerformanceOpen(true);
                            }}
                        >
                            {t('productionPerformanceOpenButton')}
                        </Button>
                    </Stack>
                </Box>
            )}

            <HelpRequestDialog
                open={helpOpen}
                details={helpDetails}
                submitting={submitting}
                onDetailsChange={setHelpDetails}
                onClose={() => {
                    setHelpOpen(false);
                    setHelpDetails('');
                }}
                onSubmit={() => void submitHelpDetails()}
            />

            <ResolveHelpDialog
                open={resolveHelpOpen}
                adminQr={resolveAdminQr}
                submitting={submitting}
                onAdminQrChange={setResolveAdminQr}
                onClose={closeResolveHelpModal}
                onResolve={() => void resolveHelpWithAdminAuth()}
            />

            <QualityInfoReviewDialog
                open={qualityInfoModalOpen}
                steps={qualityInfoSteps}
                stepIndex={qualityInfoStepIndex}
                openingSession={openingSession}
                onAbortSession={() => void abortQualityInfoReview()}
                onStepChange={(idx) => setQualityInfoStepIndex(idx)}
                onStartProduction={() => void completeQualityInfoAndOpenSession()}
            />

            <InitialControlProductDialog
                open={initialModalOpen}
                submitting={submitting}
                initialControlAssessmentsComplete={initialControlAssessmentsComplete}
                showFaultyProductWarning={showInitialFaultyProductWarning}
                prototypes={session?.measuringFeaturePrototypes ?? []}
                assessments={rowsInitial}
                technicalDrawingBase64={session?.technicalDrawingBase64}
                onAssessmentChange={(i, field, value) => updateAssessment(setRowsInitial, i, field, value)}
                onAbortSession={() => void abortInitialSession()}
                onSave={() => void handleSaveInitialControl()}
            />

            <DeclareFaultyProductDialog
                open={faultyOpen}
                onClose={() => closeFaultyModalReopenControlIfNeeded()}
                submitting={submitting}
                rejectCauseOptions={rejectCauseOptions}
                faultyReason={faultyReason}
                onFaultyReasonChange={setFaultyReason}
                faultyCause={faultyCause}
                onFaultyCauseChange={setFaultyCause}
                faultyComment={faultyComment}
                onFaultyCommentChange={setFaultyComment}
                onSave={() => void handleSaveFaulty()}
            />

            <RecordControlProductDialog
                open={controlOpen}
                submitting={submitting}
                recordControlAssessmentsComplete={recordControlAssessmentsComplete}
                showFaultyProductWarning={showRecordFaultyProductWarning}
                prototypes={session?.measuringFeaturePrototypes ?? []}
                assessments={rowsControl}
                technicalDrawingBase64={session?.technicalDrawingBase64}
                onAssessmentChange={(i, field, value) => updateAssessment(setRowsControl, i, field, value)}
                onEscapeOrBackdrop={(reason) => {
                    if (controlBlockingMode) {
                        return;
                    }
                    if (!recordControlAssessmentsComplete) {
                        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                            setActionError(t('allFieldsRequired'));
                        }
                        return;
                    }
                    setControlOpen(false);
                    setActionError(null);
                }}
                blocking={controlBlockingMode}
                goodDelta={controlGoodDelta}
                onGoodDeltaChange={setControlGoodDelta}
                onCancel={() => {
                    if (controlBlockingMode) return;
                    setControlOpen(false);
                    setActionError(null);
                }}
                onSave={() => void handleSaveOnDemandControl()}
            />

            <ProcessTechnologyDialog
                open={processOpen}
                onClose={() => setProcessOpen(false)}
                loading={processLoading}
                technology={processTechnology}
                productHint={
                    processProductHint
                        ? t('processTechnologyProductHint', {hint: processProductHint})
                        : undefined
                }
            />

            <ProductionPerformanceDialog
                open={performanceOpen}
                onClose={() => setPerformanceOpen(false)}
                loading={performanceLoading}
                session={session}
                norm100={performanceNorm100}
                productHint={
                    processProductHint
                        ? t('processTechnologyProductHint', {hint: processProductHint})
                        : undefined
                }
            />

            <ToolChangeSetupDialog
                open={toolOpen}
                onClose={() => setToolOpen(false)}
                submitting={submitting}
                setupModalLoading={setupModalLoading}
                setupModalProto={setupModalProto}
                setupHeightMeasured={setupHeightMeasured}
                onSetupHeightMeasuredChange={setSetupHeightMeasured}
                setupHeightOkNok={setupHeightOkNok}
                onSetupHeightOkNokChange={setSetupHeightOkNok}
                setupDiamMeasured={setupDiamMeasured}
                onSetupDiamMeasuredChange={setSetupDiamMeasured}
                setupDiamOkNok={setupDiamOkNok}
                onSetupDiamOkNokChange={setSetupDiamOkNok}
                setupMeasuredHeightRangeHint={setupMeasuredHeightRangeHint}
                setupMeasuredDiameterRangeHint={setupMeasuredDiameterRangeHint}
                onRecordSetup={() => void handleRecordSetup()}
            />

            <ProductionTargetReachedDialog
                open={productionTargetReachedOpen}
                onCloseSession={() => void closeSessionAfterProductionTargetReached()}
                onContinue={() => void continueAfterProductionTargetReached()}
            />

            <RecordGoodProductsDialog
                open={goodOpen}
                onClose={() => setGoodOpen(false)}
                submitting={submitting}
                goodDelta={goodDelta}
                onGoodDeltaChange={setGoodDelta}
                onSave={() => void handleSaveGood()}
            />

            <CloseWorkSessionConfirmDialog
                open={closeSessionConfirmOpen}
                submitting={submitting}
                sessionStartedAtText={sessionStartDisplay}
                sessionDurationText={sessionDurationDisplay}
                goodProductsCount={session?.productCount ?? 0}
                faultyProductsCount={session?.faultyProductCount ?? 0}
                setupProductsCount={session?.setupProductCount ?? 0}
                onConfirmClose={() => void endAndClearSelection()}
                onContinueSession={() => setCloseSessionConfirmOpen(false)}
            />
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
    const producedProgressPct =
        required != null && required > 0 ? Math.min(100, (producedWo / required) * 100) : null;
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
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        alignItems={{xs: 'stretch', sm: 'center'}}
                        spacing={{xs: 0.75, sm: 1.5}}
                        sx={{width: '100%'}}
                    >
                        <Typography variant="body2" sx={{flexShrink: 0}}>
                            {t('productionWorkOrderProducedGood')}: {producedWo}
                        </Typography>
                        {producedProgressPct != null && (
                            <LinearProgress
                                variant="determinate"
                                value={producedProgressPct}
                                color={
                                    required != null && producedWo >= required ? 'success' : 'primary'
                                }
                                sx={{
                                    flex: 1,
                                    minWidth: {sm: 64},
                                    height: 8,
                                    borderRadius: 1,
                                }}
                            />
                        )}
                    </Stack>
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
