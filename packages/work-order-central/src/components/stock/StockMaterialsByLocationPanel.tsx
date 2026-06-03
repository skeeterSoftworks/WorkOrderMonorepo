import { useEffect, useMemo, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import type { StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';

function parseStockLocationsResponse(response: unknown): StockLocationTO[] {
    const r = response as { data?: StockLocationTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

export function StockMaterialsByLocationPanel() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<StockLocationTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        Server.getAllStockLocations(
            (response: unknown) => {
                setLocations(parseStockLocationsResponse(response));
                setLoading(false);
            },
            () => {
                setError(t('stockByLocationLoadError'));
                setLocations([]);
                setLoading(false);
            },
        );
    }, [t]);

    const sortedLocations = useMemo(
        () =>
            [...locations].sort((a, b) =>
                (a.stockLocationCode ?? '').localeCompare(b.stockLocationCode ?? ''),
            ),
        [locations],
    );

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
                {t('stockMaterialsByLocationDescription')}
            </Typography>
            {sortedLocations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t('stockByLocationEmpty')}
                </Typography>
            ) : (
                sortedLocations.map((loc) => {
                    const materials = loc.stockedMaterials ?? [];
                    return (
                        <Accordion key={loc.id ?? loc.stockLocationCode} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight={600}>
                                    {loc.stockLocationCode || '—'}
                                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                        ({materials.length} {t('stockedMaterialsCountLabel')})
                                    </Typography>
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                {materials.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {t('stockByLocationNoMaterials')}
                                    </Typography>
                                ) : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t('materialName')}</TableCell>
                                                    <TableCell>{t('catalogueId')}</TableCell>
                                                    <TableCell align="right">{t('quantity')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {materials.map((sm) => (
                                                    <TableRow key={sm.id ?? `${sm.material?.code}-${sm.quantity}`}>
                                                        <TableCell>{sm.material?.name || '—'}</TableCell>
                                                        <TableCell>{sm.material?.code || '—'}</TableCell>
                                                        <TableCell align="right">{sm.quantity ?? 0}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })
            )}
        </Box>
    );
}
