import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { WorkSessionTO } from 'sf-common/src/models/ApiRequests';
import {
    formatSessionDateTime,
    operatorLabel,
    workOrderSessionLabel,
} from './productionOverviewDisplay';

type Props = {
    open: boolean;
    session: WorkSessionTO | null;
    loading: boolean;
    error: string | null;
    onClose: () => void;
};

function DetailLine({ label, value }: { label: string; value: string }) {
    return (
        <Typography variant="body2">
            <strong>{label}:</strong> {value || '—'}
        </Typography>
    );
}

export function ProductionSessionDetailsDialog({ open, session, loading, error, onClose }: Props) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('productionSessionDetails')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                        {t('loadingDetails')}
                    </Typography>
                )}
                {!loading && error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
                {!loading && !error && session && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <DetailLine label={t('workOrder')} value={workOrderSessionLabel(session)} />
                                <DetailLine label={t('machine')} value={session.stationId?.trim() || '—'} />
                                <DetailLine label={t('operator')} value={operatorLabel(session)} />
                                <DetailLine
                                    label={t('productReferenceID')}
                                    value={session.productReferenceID?.trim() || '—'}
                                />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <DetailLine
                                    label={t('sessionStart')}
                                    value={formatSessionDateTime(session.sessionStart)}
                                />
                                <DetailLine
                                    label={t('sessionEnd')}
                                    value={
                                        session.sessionEnd
                                            ? formatSessionDateTime(session.sessionEnd)
                                            : t('sessionInProgress')
                                    }
                                />
                                <DetailLine
                                    label={t('productionSessionGoodCount')}
                                    value={String(session.productCount ?? 0)}
                                />
                                <DetailLine
                                    label={t('productionSessionControlCount')}
                                    value={String(session.controlProductCount ?? 0)}
                                />
                                <DetailLine
                                    label={t('productionSessionFaultyCount')}
                                    value={String(session.faultyProductCount ?? 0)}
                                />
                                <DetailLine
                                    label={t('productionSessionSetupCount')}
                                    value={String(session.setupProductCount ?? 0)}
                                />
                            </Box>
                        </Box>

                        <Typography variant="subtitle2">{t('productionSessionGoodRecords')}</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('createdDate')}</TableCell>
                                        <TableCell align="right">{t('quantity')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(session.productRecords ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2}>{t('productionSessionNoRecords')}</TableCell>
                                        </TableRow>
                                    ) : (
                                        (session.productRecords ?? []).map((row, idx) => (
                                            <TableRow key={row.id ?? idx}>
                                                <TableCell>{formatSessionDateTime(row.timestamp)}</TableCell>
                                                <TableCell align="right">{row.goodProductsCount ?? 0}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="subtitle2">{t('productionSessionControlProducts')}</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('createdDate')}</TableCell>
                                        <TableCell>{t('productionSessionMeasuringFeatures')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(session.controlProducts ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2}>{t('productionSessionNoRecords')}</TableCell>
                                        </TableRow>
                                    ) : (
                                        (session.controlProducts ?? []).map((row, idx) => (
                                            <TableRow key={row.id ?? idx}>
                                                <TableCell>{formatSessionDateTime(row.createdAt)}</TableCell>
                                                <TableCell>
                                                    {(row.measuringFeatures ?? []).length === 0
                                                        ? '—'
                                                        : (row.measuringFeatures ?? [])
                                                              .map((feature) => {
                                                                  const name =
                                                                      feature.description?.trim()
                                                                      || feature.catalogueId?.trim()
                                                                      || '—';
                                                                  const assessed = feature.assessedValue?.trim()
                                                                      || (feature.assessedValueGood ? t('yes') : t('no'));
                                                                  return `${name}: ${assessed}`;
                                                              })
                                                              .join('; ')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="subtitle2">{t('productionSessionFaultyProducts')}</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('createdDate')}</TableCell>
                                        <TableCell>{t('productionSessionRejectReason')}</TableCell>
                                        <TableCell>{t('productionSessionRejectCause')}</TableCell>
                                        <TableCell>{t('comment')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(session.faultyProducts ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4}>{t('productionSessionNoRecords')}</TableCell>
                                        </TableRow>
                                    ) : (
                                        (session.faultyProducts ?? []).map((row, idx) => (
                                            <TableRow key={row.id ?? idx}>
                                                <TableCell>{formatSessionDateTime(row.createdAt)}</TableCell>
                                                <TableCell>{row.rejectReason?.trim() || '—'}</TableCell>
                                                <TableCell>{row.rejectCause?.trim() || '—'}</TableCell>
                                                <TableCell>{row.rejectComment?.trim() || '—'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="subtitle2">{t('productionSessionSetupProducts')}</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('createdDate')}</TableCell>
                                        <TableCell>{t('productionSessionMeasuredHeight')}</TableCell>
                                        <TableCell>{t('productionSessionMeasuredDiameter')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(session.setupProducts ?? []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3}>{t('productionSessionNoRecords')}</TableCell>
                                        </TableRow>
                                    ) : (
                                        (session.setupProducts ?? []).map((row, idx) => (
                                            <TableRow key={row.id ?? idx}>
                                                <TableCell>{formatSessionDateTime(row.recordedAt)}</TableCell>
                                                <TableCell>
                                                    {row.measuredHeight?.trim() || '—'}
                                                    {row.measuredHeightOk != null
                                                        ? ` (${row.measuredHeightOk ? t('yes') : t('no')})`
                                                        : ''}
                                                </TableCell>
                                                <TableCell>
                                                    {row.measuredDiameter?.trim() || '—'}
                                                    {row.measuredDiameterOk != null
                                                        ? ` (${row.measuredDiameterOk ? t('yes') : t('no')})`
                                                        : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
