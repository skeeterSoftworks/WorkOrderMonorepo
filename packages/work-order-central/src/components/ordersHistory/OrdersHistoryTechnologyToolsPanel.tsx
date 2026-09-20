import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Server } from 'sf-common';
import type { TechnologyToolHistoryRowTO } from 'sf-common/src/models/ApiRequests';
import { formatHistoryDateTime } from './ordersHistoryDisplay';
import {
    OrdersHistoryTechnologyToolsSearchFilters,
    type TechnologyToolHistorySearchForm,
} from './OrdersHistoryTechnologyToolsSearchFilters';

const DEFAULT_ROWS_PER_PAGE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

const EMPTY_FILTERS: TechnologyToolHistorySearchForm = {
    productReference: '',
    toolName: '',
    workOrderCode: '',
};

function operatorLabel(row: TechnologyToolHistoryRowTO): string {
    const name = [row.operatorName, row.operatorSurname].filter(Boolean).join(' ').trim();
    return name || '—';
}

export function OrdersHistoryTechnologyToolsPanel() {
    const { t } = useTranslation();
    const [applied, setApplied] = useState<TechnologyToolHistorySearchForm>(EMPTY_FILTERS);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(DEFAULT_ROWS_PER_PAGE);
    const [rows, setRows] = useState<TechnologyToolHistoryRowTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRows = useCallback(() => {
        setLoading(true);
        setError(null);
        Server.searchTechnologyToolHistory(
            {
                page,
                size,
                productReference: applied.productReference.trim() || undefined,
                toolName: applied.toolName.trim() || undefined,
                workOrderCode: applied.workOrderCode.trim() || undefined,
            },
            (response: { data?: { content?: TechnologyToolHistoryRowTO[]; totalElements?: number } }) => {
                const data = response?.data;
                setRows(Array.isArray(data?.content) ? data.content : []);
                setTotalElements(typeof data?.totalElements === 'number' ? data.totalElements : 0);
                setLoading(false);
            },
            () => {
                setRows([]);
                setTotalElements(0);
                setLoading(false);
                setError(t('ordersHistoryTechnologyToolsLoadError'));
            },
        );
    }, [applied, page, size, t]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    return (
        <Box>
            <OrdersHistoryTechnologyToolsSearchFilters
                initialFilters={applied}
                loading={loading}
                resultCount={rows.length}
                totalElements={totalElements}
                onApply={(filters) => {
                    setPage(0);
                    setApplied(filters);
                }}
            />
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('ordersHistorySessionStart')}</TableCell>
                            <TableCell>{t('workOrder')}</TableCell>
                            <TableCell>{t('catalogueId')}</TableCell>
                            <TableCell>{t('productName')}</TableCell>
                            <TableCell>{t('ordersHistoryStation')}</TableCell>
                            <TableCell>{t('operator')}</TableCell>
                            <TableCell align="right">{t('ordersHistoryToolOrder')}</TableCell>
                            <TableCell>{t('toolName')}</TableCell>
                            <TableCell align="right">{t('technologyToolWorkingTime')}</TableCell>
                            <TableCell>{t('technologyCycleTime')}</TableCell>
                            <TableCell align="right">{t('technologyNorm100')}</TableCell>
                            <TableCell align="right">{t('ordersHistorySessionGoodQty')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('ordersHistoryTechnologyToolsEmpty')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.rowKey ?? `${row.workSessionId}-${row.toolUsageId}`}>
                                    <TableCell>{formatHistoryDateTime(row.sessionStartedAt)}</TableCell>
                                    <TableCell>{row.workOrderCode?.trim() || '—'}</TableCell>
                                    <TableCell>{row.productReference?.trim() || '—'}</TableCell>
                                    <TableCell>{row.productName?.trim() || '—'}</TableCell>
                                    <TableCell>{row.stationId?.trim() || '—'}</TableCell>
                                    <TableCell>{operatorLabel(row)}</TableCell>
                                    <TableCell align="right">{row.orderNumber ?? '—'}</TableCell>
                                    <TableCell>{row.toolName?.trim() || '—'}</TableCell>
                                    <TableCell align="right">{row.workingTime ?? '—'}</TableCell>
                                    <TableCell>{row.cycleTime?.trim() || '—'}</TableCell>
                                    <TableCell align="right">{row.norm100 ?? '—'}</TableCell>
                                    <TableCell align="right">{row.sessionProductCount ?? 0}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={totalElements}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={size}
                onRowsPerPageChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                }}
                rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
                labelRowsPerPage={t('numberOfResultsPerPage')}
                labelDisplayedRows={({ from, to, count }) =>
                    t('paginationDisplayedRows', { from, to, count: count !== -1 ? count : to })
                }
            />
        </Box>
    );
}
