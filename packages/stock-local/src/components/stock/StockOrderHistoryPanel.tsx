import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { StockOrderHistoryRowTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';

const DEFAULT_ROWS_PER_PAGE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type StockOrderHistorySortField =
    | 'assignedAt'
    | 'code'
    | 'productName'
    | 'quantity'
    | 'workOrderId'
    | 'assignedByFullName';

type StockOrderHistorySearchForm = {
    productType: string;
    assignedFrom: string;
    assignedTo: string;
    assignedBy: string;
};

type StockOrderHistoryTableQuery = {
    page: number;
    size: number;
    sortBy: StockOrderHistorySortField;
    asc: boolean;
};

function toIsoDateInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonthDateRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toIsoDateInput(from), to: toIsoDateInput(to) };
}

function defaultSearchForm(): StockOrderHistorySearchForm {
    const month = currentMonthDateRange();
    return {
        productType: 'ALL',
        assignedFrom: month.from,
        assignedTo: month.to,
        assignedBy: '',
    };
}

function defaultTableQuery(): StockOrderHistoryTableQuery {
    return {
        page: 0,
        size: DEFAULT_ROWS_PER_PAGE,
        sortBy: 'assignedAt',
        asc: false,
    };
}

function formatAssignedAt(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleString();
}

function productTypeLabel(row: StockOrderHistoryRowTO, t: (key: string) => string): string {
    if (row.productType === 'MATERIAL') {
        return t('stockOrderHistoryProductTypeMaterial');
    }
    return t('stockOrderHistoryProductTypeFinishedProduct');
}

export function StockOrderHistoryPanel() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<StockOrderHistoryRowTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draftFilters, setDraftFilters] = useState<StockOrderHistorySearchForm>(defaultSearchForm);
    const [appliedFilters, setAppliedFilters] = useState<StockOrderHistorySearchForm>(defaultSearchForm);
    const [tableQuery, setTableQuery] = useState<StockOrderHistoryTableQuery>(defaultTableQuery);

    const fetchHistory = useCallback((
        filters: StockOrderHistorySearchForm,
        query: StockOrderHistoryTableQuery,
    ) => {
        setLoading(true);
        setLoadError(null);
        Server.searchStockOrderHistory(
            {
                page: query.page,
                size: query.size,
                sortBy: query.sortBy,
                asc: query.asc,
                productType: filters.productType,
                assignedFrom: filters.assignedFrom || undefined,
                assignedTo: filters.assignedTo || undefined,
                assignedBy: filters.assignedBy.trim() || undefined,
            },
            (response: { data?: { content?: StockOrderHistoryRowTO[]; totalElements?: number } }) => {
                const data = response?.data;
                setRows(Array.isArray(data?.content) ? data.content : []);
                setTotalElements(data?.totalElements ?? 0);
                setLoading(false);
            },
            () => {
                setRows([]);
                setTotalElements(0);
                setLoadError(t('stockOrderHistoryLoadError'));
                setLoading(false);
            },
        );
    }, [t]);

    useEffect(() => {
        fetchHistory(appliedFilters, tableQuery);
    }, [appliedFilters, tableQuery, fetchHistory]);

    const applyFilters = (filters: StockOrderHistorySearchForm) => {
        setTableQuery((prev) => ({ ...prev, page: 0 }));
        setAppliedFilters(filters);
    };

    const handleSort = (field: StockOrderHistorySortField) => {
        setTableQuery((prev) => ({
            ...prev,
            page: 0,
            sortBy: field,
            asc: prev.sortBy === field ? !prev.asc : true,
        }));
    };

    const handlePageChange = (_event: unknown, newPage: number) => {
        setTableQuery((prev) => ({ ...prev, page: newPage }));
    };

    const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTableQuery((prev) => ({
            ...prev,
            page: 0,
            size: parseInt(event.target.value, 10),
        }));
    };

    const updateDraft = <K extends keyof StockOrderHistorySearchForm>(
        key: K,
        value: StockOrderHistorySearchForm[K],
    ) => {
        setDraftFilters((prev) => ({ ...prev, [key]: value }));
    };

    const materialsOnlySelected = appliedFilters.productType === 'MATERIAL';

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('stockOrderHistoryDescription')}
            </Typography>

            <Box
                component="form"
                autoComplete="off"
                onSubmit={(e) => {
                    e.preventDefault();
                    applyFilters(draftFilters);
                }}
                sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}
            >
                <TextField
                    select
                    label={t('stockOrderHistoryProductTypeFilter')}
                    value={draftFilters.productType}
                    onChange={(e) => updateDraft('productType', e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                >
                    <MenuItem value="ALL">{t('stockOrderHistoryProductTypeAll')}</MenuItem>
                    <MenuItem value="FINISHED_PRODUCT">{t('stockOrderHistoryProductTypeFinishedProduct')}</MenuItem>
                    <MenuItem value="MATERIAL">{t('stockOrderHistoryProductTypeMaterial')}</MenuItem>
                </TextField>
                <TextField
                    label={t('dateFrom')}
                    type="date"
                    value={draftFilters.assignedFrom}
                    onChange={(e) => updateDraft('assignedFrom', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160 }}
                />
                <TextField
                    label={t('dateUntil')}
                    type="date"
                    value={draftFilters.assignedTo}
                    onChange={(e) => updateDraft('assignedTo', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160 }}
                />
                <TextField
                    label={t('stockOrderHistoryAssignedByFilter')}
                    value={draftFilters.assignedBy}
                    onChange={(e) => updateDraft('assignedBy', e.target.value)}
                    size="small"
                    sx={{ minWidth: 180 }}
                />
                <Button type="submit" variant="contained" disabled={loading}>
                    {t('searchAction')}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                    {t('stockOrderHistoryFilterCount', { count: rows.length, total: totalElements })}
                </Typography>
            </Box>

            {materialsOnlySelected && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('stockOrderHistoryMaterialsComingSoon')}
                </Typography>
            )}

            {loadError && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {loadError}
                </Typography>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ position: 'relative' }}>
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255,255,255,0.6)',
                            zIndex: 1,
                        }}
                    >
                        <CircularProgress size={32} />
                    </Box>
                )}
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sortDirection={tableQuery.sortBy === 'assignedAt' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'assignedAt'}
                                    direction={tableQuery.sortBy === 'assignedAt' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('assignedAt')}
                                >
                                    {t('stockOrderHistoryAssignedAtColumn')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={tableQuery.sortBy === 'code' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'code'}
                                    direction={tableQuery.sortBy === 'code' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('code')}
                                >
                                    {t('stockAssignmentOrderCode')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>{t('stockOrderHistoryProductTypeFilter')}</TableCell>
                            <TableCell sortDirection={tableQuery.sortBy === 'productName' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'productName'}
                                    direction={tableQuery.sortBy === 'productName' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('productName')}
                                >
                                    {t('product')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>{t('catalogueId')}</TableCell>
                            <TableCell align="right" sortDirection={tableQuery.sortBy === 'quantity' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'quantity'}
                                    direction={tableQuery.sortBy === 'quantity' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('quantity')}
                                >
                                    {t('quantity')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={tableQuery.sortBy === 'workOrderId' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'workOrderId'}
                                    direction={tableQuery.sortBy === 'workOrderId' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('workOrderId')}
                                >
                                    {t('workOrder')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sortDirection={tableQuery.sortBy === 'assignedByFullName' ? (tableQuery.asc ? 'asc' : 'desc') : false}>
                                <TableSortLabel
                                    active={tableQuery.sortBy === 'assignedByFullName'}
                                    direction={tableQuery.sortBy === 'assignedByFullName' && !tableQuery.asc ? 'desc' : 'asc'}
                                    onClick={() => handleSort('assignedByFullName')}
                                >
                                    {t('stockOrderHistoryAssignedByColumn')}
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        {materialsOnlySelected
                                            ? t('stockOrderHistoryMaterialsComingSoon')
                                            : t('stockOrderHistoryNoRows')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <TableRow key={row.id ?? row.code ?? `${row.assignedAt}-${row.workOrderId}`}>
                                <TableCell>{formatAssignedAt(row.assignedAt)}</TableCell>
                                <TableCell>{row.code ?? '—'}</TableCell>
                                <TableCell>{productTypeLabel(row, t)}</TableCell>
                                <TableCell>{row.productName ?? '—'}</TableCell>
                                <TableCell>{row.productReference ?? '—'}</TableCell>
                                <TableCell align="right">{row.quantity ?? '—'}</TableCell>
                                <TableCell>{row.workOrderId ?? '—'}</TableCell>
                                <TableCell>
                                    {row.assignedByFullName?.trim()
                                        || row.assignedByUserQr?.trim()
                                        || '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={totalElements}
                    page={tableQuery.page}
                    onPageChange={handlePageChange}
                    rowsPerPage={tableQuery.size}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
                    labelRowsPerPage={t('rowsPerPage')}
                />
            </TableContainer>
        </Box>
    );
}
