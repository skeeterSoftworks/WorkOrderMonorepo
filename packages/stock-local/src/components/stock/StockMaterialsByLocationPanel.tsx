import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import type { StockLocationTO } from 'sf-common/src/models/ApiRequests';
import {
    collectStockCatalogueIds,
    filterStockLocationsByCatalogueId,
    StockLocationCatalogueFilterBar,
} from 'sf-common';
import { Server } from '../../api/Server';

function parseStockLocationsResponse(response: unknown): StockLocationTO[] {
    const r = response as { data?: StockLocationTO[] };
    return Array.isArray(r?.data) ? r.data : [];
}

export function StockMaterialsByLocationPanel() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<StockLocationTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filterDraftCatalogueId, setFilterDraftCatalogueId] = useState('');
    const [appliedCatalogueId, setAppliedCatalogueId] = useState('');

    useEffect(() => {
        Server.getAllStockLocations(
            (response: unknown) => {
                setLocations(parseStockLocationsResponse(response));
                setLoading(false);
            },
            () => {
                setLoadError(true);
                setLoading(false);
            },
        );
    }, []);

    const catalogueOptions = useMemo(() => collectStockCatalogueIds(locations), [locations]);

    const sortedLocations = useMemo(
        () =>
            [...filterStockLocationsByCatalogueId(locations, appliedCatalogueId)].sort((a, b) =>
                (a.stockLocationCode ?? '').localeCompare(b.stockLocationCode ?? ''),
            ),
        [locations, appliedCatalogueId],
    );

    const applyCatalogueFilter = () => {
        setAppliedCatalogueId(filterDraftCatalogueId.trim());
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (loadError) {
        return <Typography color="error">{t('stockByLocationLoadError')}</Typography>;
    }

    return (
        <Box>
            <StockLocationCatalogueFilterBar
                draftCatalogueId={filterDraftCatalogueId}
                catalogueOptions={catalogueOptions}
                onDraftChange={setFilterDraftCatalogueId}
                onSubmit={applyCatalogueFilter}
                disabled={loading}
            />

            {sortedLocations.length === 0 ? (
                <Typography color="text.secondary">
                    {appliedCatalogueId
                        ? t('stockByLocationNoLocationsForCatalogueId', { catalogueId: appliedCatalogueId })
                        : t('stockByLocationEmpty')}
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
