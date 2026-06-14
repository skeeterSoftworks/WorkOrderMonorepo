import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { StockLocationTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { useTranslation } from 'react-i18next';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { StockLocationFormSection } from './StockLocationFormSection';

function parseStockLocationsResponse(response: unknown): StockLocationTO[] {
    const r = response as { data?: StockLocationTO[] | { data?: StockLocationTO[] } };
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

export function StockLocationsManagementPanel() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<StockLocationTO[]>([]);
    const [editingLocation, setEditingLocation] = useState<StockLocationTO | null>(null);
    const [locationToDelete, setLocationToDelete] = useState<StockLocationTO | null>(null);

    const sortedLocations = useMemo(
        () => [...locations].sort((a, b) => (a.stockLocationCode ?? '').localeCompare(b.stockLocationCode ?? '')),
        [locations],
    );

    const loadLocations = () => {
        Server.getAllStockLocations(
            (response: unknown) => setLocations(parseStockLocationsResponse(response)),
            (err: unknown) => toastServerError(err, t),
        );
    };

    useEffect(() => {
        loadLocations();
    }, []);

    const addOrUpdateLocation = (stockLocationCode: string) => {
        const payload: StockLocationTO = { id: editingLocation?.id, stockLocationCode };
        const onSuccess = () => {
            loadLocations();
            setEditingLocation(null);
            toastActionSuccess(editingLocation ? t('toastStockLocationUpdated') : t('toastStockLocationSaved'));
        };
        if (editingLocation?.id) {
            Server.editStockLocation(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addStockLocation(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const confirmDeleteLocation = () => {
        if (!locationToDelete?.id) return;
        Server.deleteStockLocation(
            locationToDelete.id,
            () => {
                setLocationToDelete(null);
                loadLocations();
                if (editingLocation?.id === locationToDelete.id) setEditingLocation(null);
                toastActionSuccess(t('toastStockLocationDeleted'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('stockLocationsManagement')}</Typography>
            <Paper sx={{ p: 2 }}>
                <StockLocationFormSection
                    editingLocation={editingLocation}
                    onSubmit={addOrUpdateLocation}
                    onCancelEdit={() => setEditingLocation(null)}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('stockLocationCode')}</TableCell>
                                <TableCell align="right">{t('stockedMaterialsCount')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedLocations.length > 0 ? sortedLocations.map((loc) => (
                                <TableRow key={loc.id ?? loc.stockLocationCode}>
                                    <TableCell>{loc.stockLocationCode ?? '—'}</TableCell>
                                    <TableCell align="right">{loc.stockedMaterials?.length ?? 0}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => setEditingLocation(loc)} title={t('edit')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" sx={tableActionIconButtonSx.delete} onClick={() => setLocationToDelete(loc)} title={t('remove')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Typography variant="body2" color="text.secondary">{t('noStockLocations')}</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <ConfirmationModal open={!!locationToDelete} modalMessage={t('confirmDeleteStockLocation')} onConfirm={confirmDeleteLocation} onModalClose={() => setLocationToDelete(null)} />
        </Box>
    );
}
