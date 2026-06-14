import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductAvailableStockTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';

export function StockProductsAvailablePanel() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<ProductAvailableStockTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        Server.getProductStockAvailability(
            (response: { data?: ProductAvailableStockTO[] }) => {
                const data = Array.isArray(response?.data) ? response.data : [];
                setRows(data);
                setLoading(false);
            },
            () => {
                setError(t('stockProductsLoadError'));
                setRows([]);
                setLoading(false);
            },
        );
    }, [t]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary">{t('fetchingData')}</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" sx={{ py: 2 }}>
                {error}
            </Typography>
        );
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('stockProductsAvailabilityDescription')}
            </Typography>
            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t('stockNoAvailableProducts')}
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('catalogueId')}</TableCell>
                                <TableCell>{t('product')}</TableCell>
                                <TableCell align="right">{t('stockAvailableQuantityColumn')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.productId ?? `${r.productReference}-${r.productName}`}>
                                    <TableCell>{r.productReference ?? '—'}</TableCell>
                                    <TableCell>{r.productName ?? '—'}</TableCell>
                                    <TableCell align="right">{r.availableQuantity ?? 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
