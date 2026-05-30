import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';
import type {ProductsRecordTO, WorkSessionResponseTO} from '../models/ApiRequests';

export const MIN_EXPECTED_PRODUCT_RECORDS = 8;

export type PerformancePoint = {
    timeMs: number;
    cumulative: number;
};

function parseTimeMs(value: string | undefined): number | null {
    if (!value?.trim()) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Records with valid timestamps, chronological. */
export function sortedProductRecordsWithTimestamps(session: WorkSessionResponseTO | null): ProductsRecordTO[] {
    if (!session?.productRecords?.length) return [];
    const withTs = session.productRecords.filter((r) => parseTimeMs(r.timestamp) != null);
    return withTs.sort((a, b) => {
        const ta = parseTimeMs(a.timestamp) ?? 0;
        const tb = parseTimeMs(b.timestamp) ?? 0;
        if (ta !== tb) return ta - tb;
        return (a.id ?? 0) - (b.id ?? 0);
    });
}

export function computePerformanceTimeDomain(
    session: WorkSessionResponseTO | null,
    points: PerformancePoint[],
): {t0: number; t1: number} | null {
    if (!session) return null;
    const now = Date.now();
    const startMs = parseTimeMs(session.sessionStart);
    const endMs = parseTimeMs(session.sessionEnd);
    const fromPointsMin = points.length > 0 ? Math.min(...points.map((p) => p.timeMs)) : null;
    const fromPointsMax = points.length > 0 ? Math.max(...points.map((p) => p.timeMs)) : null;
    let t1 = Math.max(endMs ?? now, fromPointsMax ?? now, now);
    let t0 = startMs ?? fromPointsMin ?? t1 - 3_600_000;
    if (t0 >= t1) {
        t0 = t1 - 60_000;
    }
    return {t0, t1};
}

/**
 * Cumulative good from product records + constant (setup + control) offset.
 * X for each record aligns with the bottom tick for that record (slot 1..8); the line does not extend to session end.
 */
export function buildPerformancePoints(session: WorkSessionResponseTO | null): PerformancePoint[] {
    if (!session) return [];
    const offset =
        Number(session.setupProductCount ?? 0) + Number(session.controlProductCount ?? 0);
    const startMs = parseTimeMs(session.sessionStart);
    const records = sortedProductRecordsWithTimestamps(session);

    const draftForDomain: PerformancePoint[] = [];
    if (startMs != null) {
        draftForDomain.push({timeMs: startMs, cumulative: offset});
    }
    let draftRun = 0;
    for (const r of records) {
        const t = parseTimeMs(r.timestamp);
        if (t == null) continue;
        const delta = Number(r.goodProductsCount ?? 0);
        draftRun += Number.isFinite(delta) ? delta : 0;
        draftForDomain.push({timeMs: t, cumulative: draftRun + offset});
    }

    const domain = computePerformanceTimeDomain(session, draftForDomain);
    if (!domain) return [];
    const {t0, t1} = domain;
    const xSpan = Math.max(t1 - t0, 60_000);

    const points: PerformancePoint[] = [];
    if (startMs != null) {
        points.push({timeMs: startMs, cumulative: offset});
    }

    let runningGood = 0;
    let recordIndex = 0;
    for (const r of records) {
        if (parseTimeMs(r.timestamp) == null) continue;
        const delta = Number(r.goodProductsCount ?? 0);
        runningGood += Number.isFinite(delta) ? delta : 0;
        recordIndex += 1;
        const slot = Math.min(recordIndex, MIN_EXPECTED_PRODUCT_RECORDS);
        const timeMs = t0 + (slot / MIN_EXPECTED_PRODUCT_RECORDS) * xSpan;
        points.push({timeMs, cumulative: runningGood + offset});
    }

    if (startMs == null && recordIndex > 0) {
        points.unshift({timeMs: t0, cumulative: offset});
    }

    if (points.length === 0 && offset === 0) {
        return [];
    }

    if (points.length === 0) {
        points.push({timeMs: t0, cumulative: offset});
        return points;
    }

    points.sort((a, b) => a.timeMs - b.timeMs);
    let mono = 0;
    for (const p of points) {
        mono = Math.max(mono, p.cumulative);
        p.cumulative = mono;
    }
    return points;
}

const COLOR_IDEAL_100 = '#388e3c';
const COLOR_IDEAL_85 = '#c9a415';
const COLOR_ACTUAL = '#111';

type ChartProps = {
    session: WorkSessionResponseTO;
    points: PerformancePoint[];
    norm100: number | null;
};

function PerformanceLineChart({session, points, norm100}: ChartProps) {
    const {t, i18n} = useTranslation();
    const W = 640;
    const H = 340;
    const padL = 52;
    const padR = 20;
    const padT = 28;
    const padB = 50;

    const domain = computePerformanceTimeDomain(session, points);
    if (!domain) return null;
    const {t0, t1} = domain;
    const xSpan = Math.max(t1 - t0, 60_000);

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxYData = points.length > 0 ? Math.max(...points.map((p) => p.cumulative), 0) : 0;
    const n100 = norm100 != null && Number.isFinite(norm100) && norm100 > 0 ? norm100 : null;
    const n85 = n100 != null ? n100 * 0.85 : null;
    const yTop = Math.max(n100 ?? 0, n85 ?? 0, maxYData, 1) * 1.08;
    const yBottom = 0;

    const sx = (tm: number) => padL + ((tm - t0) / xSpan) * innerW;
    const sy = (y: number) => padT + innerH - ((y - yBottom) / (yTop - yBottom)) * innerH;

    const pathActual =
        points.length > 0
            ? points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.timeMs).toFixed(2)} ${sy(p.cumulative).toFixed(2)}`)
                  .join(' ')
            : '';

    const idealPoints =
        n100 != null
            ? Array.from({length: MIN_EXPECTED_PRODUCT_RECORDS + 1}, (_, i) => ({
                  timeMs: t0 + (i / MIN_EXPECTED_PRODUCT_RECORDS) * xSpan,
                  y100: n100 * (i / MIN_EXPECTED_PRODUCT_RECORDS),
                  y85: n100 * 0.85 * (i / MIN_EXPECTED_PRODUCT_RECORDS),
              }))
            : [];

    const pathIdeal100 =
        idealPoints.length > 0
            ? idealPoints
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.timeMs).toFixed(2)} ${sy(p.y100).toFixed(2)}`)
                  .join(' ')
            : '';

    const pathIdeal85 =
        idealPoints.length > 0
            ? idealPoints
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.timeMs).toFixed(2)} ${sy(p.y85).toFixed(2)}`)
                  .join(' ')
            : '';

    const sortedRecords = sortedProductRecordsWithTimestamps(session);

    const yTicks = 5;
    const yLabels: {y: number; lab: string}[] = [];
    for (let i = 0; i <= yTicks; i++) {
        const v = yBottom + (i / yTicks) * (yTop - yBottom);
        yLabels.push({y: v, lab: Math.round(v).toString()});
    }

    const axisY = H - padB;

    return (
        <Box sx={{width: '100%', overflowX: 'auto'}}>
            <svg
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                style={{display: 'block', maxWidth: '100%', height: 'auto'}}
                aria-label={t('productionPerformanceChartAria')}
            >
                {yLabels.map(({y}) => (
                    <line
                        key={`gy-${y}`}
                        x1={padL}
                        x2={W - padR}
                        y1={sy(y)}
                        y2={sy(y)}
                        stroke="currentColor"
                        strokeOpacity={0.08}
                    />
                ))}
                <line
                    x1={padL}
                    x2={padL}
                    y1={padT}
                    y2={axisY}
                    stroke="currentColor"
                    strokeOpacity={0.35}
                />
                <line
                    x1={padL}
                    x2={W - padR}
                    y1={axisY}
                    y2={axisY}
                    stroke="currentColor"
                    strokeOpacity={0.35}
                />
                {yLabels.map(({y, lab}) => (
                    <text
                        key={`yl-${y}`}
                        x={padL - 8}
                        y={sy(y) + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="currentColor"
                        opacity={0.75}
                    >
                        {lab}
                    </text>
                ))}
                {pathIdeal85 ? (
                    <path
                        d={pathIdeal85}
                        fill="none"
                        stroke={COLOR_IDEAL_85}
                        strokeWidth={2.25}
                        strokeLinejoin="round"
                    />
                ) : null}
                {pathIdeal100 ? (
                    <path
                        d={pathIdeal100}
                        fill="none"
                        stroke={COLOR_IDEAL_100}
                        strokeWidth={2.25}
                        strokeLinejoin="round"
                    />
                ) : null}
                {pathActual ? (
                    <path
                        d={pathActual}
                        fill="none"
                        stroke={COLOR_ACTUAL}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                    />
                ) : null}
                {Array.from({length: MIN_EXPECTED_PRODUCT_RECORDS}, (_, idx) => {
                    const slot = idx + 1;
                    const x = sx(t0 + (slot / MIN_EXPECTED_PRODUCT_RECORDS) * xSpan);
                    const rec = sortedRecords[idx];
                    const ts = rec ? parseTimeMs(rec.timestamp) : null;
                    const label =
                        ts != null
                            ? new Date(ts).toLocaleTimeString(i18n.language, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                              })
                            : null;
                    return (
                        <g key={`slot-${slot}`}>
                            <line
                                x1={x}
                                x2={x}
                                y1={axisY}
                                y2={axisY - (label ? 10 : 6)}
                                stroke="currentColor"
                                strokeOpacity={label ? 0.45 : 0.28}
                                strokeWidth={label ? 1.5 : 1}
                            />
                            {label ? (
                                <text
                                    x={x}
                                    y={axisY + 20}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="currentColor"
                                    opacity={0.85}
                                >
                                    {label}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
                <text
                    x={12}
                    y={padT + innerH / 2}
                    transform={`rotate(-90 12 ${padT + innerH / 2})`}
                    textAnchor="middle"
                    fontSize={12}
                    fill="currentColor"
                    opacity={0.85}
                >
                    {t('productionPerformanceYAxis')}
                </text>
                {n100 != null && (
                    <text
                        x={W - padR - 4}
                        y={sy(n100) - 6}
                        textAnchor="end"
                        fontSize={10}
                        fill={COLOR_IDEAL_100}
                        fontWeight={600}
                    >
                        {t('productionPerformanceIdeal100EndLabel', {value: Math.round(n100)})}
                    </text>
                )}
                {n85 != null && n100 != null && (
                    <text
                        x={W - padR - 4}
                        y={sy(n85) - 6}
                        textAnchor="end"
                        fontSize={10}
                        fill={COLOR_IDEAL_85}
                        fontWeight={600}
                    >
                        {t('productionPerformanceIdeal85EndLabel', {value: Math.round(n85)})}
                    </text>
                )}
            </svg>
            <Stack direction="column" alignItems="flex-start" spacing={0.75} sx={{mt: 1}}>
                <Typography variant="caption" color="text.secondary" component="div">
                    <Box
                        component="span"
                        sx={{
                            display: 'inline-block',
                            width: 24,
                            borderBottom: `3px solid ${COLOR_ACTUAL}`,
                            verticalAlign: 'middle',
                            mr: 0.75,
                        }}
                    />
                    {t('productionPerformanceActualLegend')}
                </Typography>
                {n100 != null && (
                    <Typography variant="caption" sx={{color: COLOR_IDEAL_100}} component="div">
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                width: 24,
                                borderBottom: `2px solid ${COLOR_IDEAL_100}`,
                                verticalAlign: 'middle',
                                mr: 0.75,
                            }}
                        />
                        {t('productionPerformanceIdeal100Legend')}
                    </Typography>
                )}
                {n100 != null && (
                    <Typography variant="caption" sx={{color: COLOR_IDEAL_85}} component="div">
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                width: 24,
                                borderBottom: `2px solid ${COLOR_IDEAL_85}`,
                                verticalAlign: 'middle',
                                mr: 0.75,
                            }}
                        />
                        {t('productionPerformanceIdeal85Legend')}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

export type ProductionPerformanceDialogProps = {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    session: WorkSessionResponseTO | null;
    norm100: number | null;
    productHint?: string;
};

function canRenderPerformanceChart(session: WorkSessionResponseTO | null, points: PerformancePoint[]): boolean {
    if (!session) return false;
    const domain = computePerformanceTimeDomain(session, points);
    if (!domain) return false;
    return domain.t1 > domain.t0;
}

export function ProductionPerformanceDialog({
    open,
    onClose,
    loading,
    session,
    norm100
}: ProductionPerformanceDialogProps) {
    const {t} = useTranslation();
    const points = session ? buildPerformancePoints(session) : [];
    const showChart = canRenderPerformanceChart(session, points);
    const showEmptyMessage = !loading && session && !showChart;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle>{t('productionPerformanceTitle')}</DialogTitle>
            <DialogContent dividers>

                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                        <CircularProgress size={32} />
                    </Box>
                ) : showEmptyMessage ? (
                    <Typography variant="body2" color="text.secondary">
                        {t('productionPerformanceEmpty')}
                    </Typography>
                ) : session && showChart ? (
                    <PerformanceLineChart session={session} points={points} norm100={norm100} />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {t('productionPerformanceEmpty')}
                    </Typography>
                )}
                {!loading && session && showChart && norm100 == null && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{mt: 2}}>
                        {t('productionPerformanceNormUnknown')}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{px: 3, py: 2}}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    {t('close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
