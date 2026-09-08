import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Server } from 'sf-common';
import type { CustomerTO, ProductOrderHistoryRowTO } from 'sf-common/src/models/ApiRequests';
import { customerHistoryLabel, formatHistoryDateTime } from './ordersHistoryDisplay';

const DEFAULT_ROWS_PER_PAGE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type ProductHistoryFilters = {
    productReference: string;
    customerId: number | '';
};

function purchaseOrderStatusLabel(status: string | undefined, translate: TFunction): string {
    const s = status ?? 'CREATED';
    switch (s) {
        case 'CREATED':
            return translate('stateCreated');
        case 'CONFIRMED':
            return translate('stateConfirmed');
        case 'IN_PRODUCTION':
            return translate('stateInProduction');
        case 'COMPLETED':
            return translate('stateCompleted');
        case 'DELIVERED':
            return translate('stateDelivered');
        case 'CANCELLED':
            return translate('stateCancelled');
        case 'REJECTED':
            return translate('stateRejected');
        default:
            return status ?? '—';
    }
}

function unwrapList<T>(response: { data?: T[] | { data?: T[] } }): T[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    return [];
}

export function OrdersHistoryProductsPanel() {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ProductHistoryFilters>({ productReference: '', customerId: '' });
    const [applied, setApplied] = useState<ProductHistoryFilters>({ productReference: '', customerId: '' });
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(DEFAULT_ROWS_PER_PAGE);
    const [rows, setRows] = useState<ProductOrderHistoryRowTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customers, setCustomers] = useState<CustomerTO[]>([]);

    useEffect(() => {
        Server.getAllCustomers(
            (response: { data?: CustomerTO[] | { data?: CustomerTO[] } }) => {
                setCustomers(unwrapList<CustomerTO>(response).filter((c) => c.id != null));
            },
            () => {},
        );
    }, []);

    const customersSorted = useMemo(
        () => [...customers].sort((a, b) => customerHistoryLabel(a).localeCompare(customerHistoryLabel(b))),
        [customers],
    );

    const fetchRows = useCallback(() => {
        setLoading(true);
        setError(null);
        Server.searchProductOrderHistory(
            {
                page,
                size,
                productReference: applied.productReference.trim() || undefined,
                customerId: applied.customerId === '' ? undefined : applied.customerId,
            },
            (response: { data?: { content?: ProductOrderHistoryRowTO[]; totalElements?: number } }) => {
                setRows(Array.isArray(response?.data?.content) ? response.data.content : []);
                setTotalElements(response?.data?.totalElements ?? 0);
                setLoading(false);
            },
            () => {
                setRows([]);
                setTotalElements(0);
                setLoading(false);
                setError(t('ordersHistoryLoadError'));
            },
        );
    }, [applied, page, size, t]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        setPage(0);
        setApplied({ ...draft });
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Box
                component="form"
                onSubmit={applyFilters}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}
            >
                <TextField
                    label={t('catalogueId')}
                    value={draft.productReference}
                    onChange={(e) => setDraft((prev) => ({ ...prev, productReference: e.target.value }))}
                    size="small"
                    sx={{ minWidth: 200 }}
                />
                <TextField
                    select
                    label={t('purchaseOrderOrderer')}
                    value={draft.customerId}
                    onChange={(e) =>
                        setDraft((prev) => ({
                            ...prev,
                            customerId: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                    }
                    size="small"
                    sx={{ minWidth: 240 }}
                >
                    <MenuItem value="">{t('filterAll')}</MenuItem>
                    {customersSorted.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                            {customerHistoryLabel(customer)}
                        </MenuItem>
                    ))}
                </TextField>
                <Button type="submit" variant="contained" size="small">
                    {t('searchAction')}
                </Button>
            </Box>
            {loading && (
                <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    {t('loadingDetails')}
                </Typography>
            )}
            {error && (
                <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                    {error}
                </Typography>
            )}
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('date')}</TableCell>
                            <TableCell>{t('orderNumber')}</TableCell>
                            <TableCell>{t('catalogueId')}</TableCell>
                            <TableCell>{t('product')}</TableCell>
                            <TableCell>{t('purchaseOrderOrderer')}</TableCell>
                            <TableCell align="right">{t('quantity')}</TableCell>
                            <TableCell>{t('status')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('ordersHistoryEmpty')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{formatHistoryDateTime(row.orderedAt)}</TableCell>
                                    <TableCell>
                                        {row.purchaseOrderCode?.trim()
                                            || (row.purchaseOrderId != null ? `#${row.purchaseOrderId}` : '—')}
                                    </TableCell>
                                    <TableCell>{row.productReference?.trim() || '—'}</TableCell>
                                    <TableCell>{row.productName?.trim() || '—'}</TableCell>
                                    <TableCell>
                                        {customerHistoryLabel({
                                            companyName: row.customerName,
                                            buyerId: row.buyerId,
                                            id: row.customerId,
                                        })}
                                    </TableCell>
                                    <TableCell align="right">{row.quantity ?? 0}</TableCell>
                                    <TableCell>{purchaseOrderStatusLabel(row.orderStatus, t)}</TableCell>
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
                onPageChange={(_e, nextPage) => setPage(nextPage)}
                rowsPerPage={size}
                onRowsPerPageChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setSize(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
                labelRowsPerPage={t('numberOfResultsPerPage')}
                labelDisplayedRows={({ from, to, count }) =>
                    t('paginationDisplayedRows', { from, to, count: count !== -1 ? count : to })
                }
            />
        </Paper>
    );
}
