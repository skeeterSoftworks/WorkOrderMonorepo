import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProductCatalogEntryTO, ProductStockIntakeTO } from 'sf-common/src/models/ApiRequests';
import { Server } from '../../api/Server';
import { AddProductsToStockDialog } from './AddProductsToStockDialog';
import {
    formatProductStockIntakeQuantity,
    formatReceivedAt,
    formatSurplusQuantity,
} from './productStockIntakeDisplay';

function parseIntakesResponse(response: unknown): ProductStockIntakeTO[] {
    const r = response as { data?: ProductStockIntakeTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

function parseCatalogResponse(response: unknown): ProductCatalogEntryTO[] {
    const r = response as { data?: ProductCatalogEntryTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

export function IncomingProductsReceptionPage() {
    const { t } = useTranslation();
    const [intakes, setIntakes] = useState<ProductStockIntakeTO[]>([]);
    const [catalog, setCatalog] = useState<ProductCatalogEntryTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const loadData = useCallback((options?: { refresh?: boolean }) => {
        if (options?.refresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setLoadError(false);

        let intakesDone = false;
        let catalogDone = false;
        let nextIntakes: ProductStockIntakeTO[] = [];
        let nextCatalog: ProductCatalogEntryTO[] = [];
        let failed = false;

        const finish = () => {
            if (!intakesDone || !catalogDone) {
                return;
            }
            if (failed) {
                setLoadError(true);
            } else {
                setIntakes(nextIntakes);
                setCatalog(nextCatalog);
            }
            setLoading(false);
            setRefreshing(false);
        };

        Server.getRecentProductStockIntakes(
            (response: unknown) => {
                nextIntakes = parseIntakesResponse(response);
                intakesDone = true;
                finish();
            },
            () => {
                failed = true;
                intakesDone = true;
                finish();
            },
        );

        Server.getProductCatalog(
            (response: unknown) => {
                nextCatalog = parseCatalogResponse(response);
                catalogDone = true;
                finish();
            },
            () => {
                failed = true;
                catalogDone = true;
                finish();
            },
        );
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaved = () => {
        loadData({ refresh: true });
    };

    return (
        <Box sx={{ py: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
                {t('incomingProductsReception')}
            </Typography>
            <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
                {t('backToHome')}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => setDialogOpen(true)} disabled={loading}>
                    {t('addProductsToStock')}
                </Button>
            </Box>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}
            {!loading && loadError && (
                <Typography color="error">{t('incomingProductsLoadError')}</Typography>
            )}
            {!loading && !loadError && (
                <>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        {t('recentProductStockIntakes')}
                    </Typography>
                    <Paper sx={{ p: 1 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('productReference')}</TableCell>
                                        <TableCell>{t('productName')}</TableCell>
                                        <TableCell>{t('workOrder')}</TableCell>
                                        <TableCell>{t('stickerNumber')}</TableCell>
                                        <TableCell>{t('quantity')}</TableCell>
                                        <TableCell>{t('productStockIntakeSurplusQuantity')}</TableCell>
                                        <TableCell>{t('receivedAt')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {intakes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                {t('incomingProductsNoIntakes')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        intakes.map((row) => (
                                            <TableRow key={row.id ?? `${row.productId}-${row.receivedAt}`}>
                                                <TableCell>{row.productReference || '—'}</TableCell>
                                                <TableCell>{row.productName || '—'}</TableCell>
                                                <TableCell>{row.workOrderId != null ? `#${row.workOrderId}` : '—'}</TableCell>
                                                <TableCell>{row.stickerNumber || '—'}</TableCell>
                                                <TableCell>
                                                    {formatProductStockIntakeQuantity(row.quantity, row.unitOfMeasure, t)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatSurplusQuantity(row.surplusQuantity, row.unitOfMeasure, t)}
                                                </TableCell>
                                                <TableCell>{formatReceivedAt(row.receivedAt)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
            {!loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => loadData({ refresh: true })}
                        disabled={refreshing}
                        startIcon={
                            refreshing ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <RefreshIcon />
                            )
                        }
                    >
                        {t('synchronizeTable')}
                    </Button>
                </Box>
            )}

            <AddProductsToStockDialog
                open={dialogOpen}
                catalog={catalog}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />
        </Box>
    );
}
