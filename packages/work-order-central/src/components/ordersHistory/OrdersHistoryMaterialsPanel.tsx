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
import { Server } from 'sf-common';
import type { MaterialOrderHistoryRowTO, MaterialProviderTO } from 'sf-common/src/models/ApiRequests';
import { formatHistoryDateTime } from './ordersHistoryDisplay';

const DEFAULT_ROWS_PER_PAGE = 25;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type MaterialHistoryFilters = {
    materialCode: string;
    materialProviderId: number | '';
};

function unwrapList<T>(response: { data?: T[] | { data?: T[] } }): T[] {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    return [];
}

function providerLabel(provider: { name?: string; id?: number }): string {
    return provider.name?.trim() || (provider.id != null ? `#${provider.id}` : '—');
}

export function OrdersHistoryMaterialsPanel() {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<MaterialHistoryFilters>({ materialCode: '', materialProviderId: '' });
    const [applied, setApplied] = useState<MaterialHistoryFilters>({ materialCode: '', materialProviderId: '' });
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(DEFAULT_ROWS_PER_PAGE);
    const [rows, setRows] = useState<MaterialOrderHistoryRowTO[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [providers, setProviders] = useState<MaterialProviderTO[]>([]);

    useEffect(() => {
        Server.getAllMaterialProviders(
            (response: { data?: MaterialProviderTO[] | { data?: MaterialProviderTO[] } }) => {
                setProviders(unwrapList<MaterialProviderTO>(response).filter((p) => p.id != null));
            },
            () => {},
        );
    }, []);

    const providersSorted = useMemo(
        () => [...providers].sort((a, b) => providerLabel(a).localeCompare(providerLabel(b))),
        [providers],
    );

    const fetchRows = useCallback(() => {
        setLoading(true);
        setError(null);
        Server.searchMaterialOrderHistory(
            {
                page,
                size,
                materialCode: applied.materialCode.trim() || undefined,
                materialProviderId: applied.materialProviderId === '' ? undefined : applied.materialProviderId,
            },
            (response: { data?: { content?: MaterialOrderHistoryRowTO[]; totalElements?: number } }) => {
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
                    label={t('materialCode')}
                    value={draft.materialCode}
                    onChange={(e) => setDraft((prev) => ({ ...prev, materialCode: e.target.value }))}
                    size="small"
                    sx={{ minWidth: 200 }}
                />
                <TextField
                    select
                    label={t('materialProviderName')}
                    value={draft.materialProviderId}
                    onChange={(e) =>
                        setDraft((prev) => ({
                            ...prev,
                            materialProviderId: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                    }
                    size="small"
                    sx={{ minWidth: 240 }}
                >
                    <MenuItem value="">{t('filterAll')}</MenuItem>
                    {providersSorted.map((provider) => (
                        <MenuItem key={provider.id} value={provider.id}>
                            {providerLabel(provider)}
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
                            <TableCell>{t('materialCode')}</TableCell>
                            <TableCell>{t('materialName')}</TableCell>
                            <TableCell>{t('materialProviderName')}</TableCell>
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
                                        {row.materialOrderCode?.trim()
                                            || (row.materialOrderId != null ? `#${row.materialOrderId}` : '—')}
                                    </TableCell>
                                    <TableCell>{row.materialCode?.trim() || '—'}</TableCell>
                                    <TableCell>{row.materialName?.trim() || '—'}</TableCell>
                                    <TableCell>{providerLabel({
                                        name: row.materialProviderName,
                                        id: row.materialProviderId,
                                    })}</TableCell>
                                    <TableCell align="right">
                                        {row.quantity ?? 0}
                                        {row.unitOfMeasure ? ` ${row.unitOfMeasure}` : ''}
                                    </TableCell>
                                    <TableCell>
                                        {row.status
                                            ? t(`materialOrderStatus_${row.status}`)
                                            : '—'}
                                    </TableCell>
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
