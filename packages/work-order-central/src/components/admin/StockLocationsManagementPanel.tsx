import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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

function parseStockLocationsResponse(response: unknown): StockLocationTO[] {
    const r = response as { data?: StockLocationTO[] | { data?: StockLocationTO[] } };
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

export function StockLocationsManagementPanel() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<StockLocationTO[]>([]);
    const [editingId, setEditingId] = useState<number | undefined>(undefined);
    const [stockLocationCode, setStockLocationCode] = useState('');
    const [locationToDelete, setLocationToDelete] = useState<StockLocationTO | null>(null);

    const sortedLocations = useMemo(
        () =>
            [...locations].sort((a, b) =>
                (a.stockLocationCode ?? '').localeCompare(b.stockLocationCode ?? ''),
            ),
        [locations],
    );

    const loadLocations = () => {
        Server.getAllStockLocations(
            (response: unknown) => {
                setLocations(parseStockLocationsResponse(response));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    useEffect(() => {
        loadLocations();
    }, []);

    const resetForm = () => {
        setEditingId(undefined);
        setStockLocationCode('');
    };

    const isFormValid = Boolean(stockLocationCode.trim());

    const addOrUpdateLocation = () => {
        if (!isFormValid) return;
        const payload: StockLocationTO = {
            id: editingId,
            stockLocationCode: stockLocationCode.trim(),
        };
        const onSuccess = () => {
            loadLocations();
            resetForm();
            toastActionSuccess(
                editingId ? t('toastStockLocationUpdated') : t('toastStockLocationSaved'),
            );
        };
        if (editingId) {
            Server.editStockLocation(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addStockLocation(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const editLocation = (location: StockLocationTO) => {
        setEditingId(location.id);
        setStockLocationCode(location.stockLocationCode ?? '');
    };

    const confirmDeleteLocation = () => {
        if (!locationToDelete?.id) return;
        Server.deleteStockLocation(
            locationToDelete.id,
            () => {
                setLocationToDelete(null);
                loadLocations();
                if (editingId === locationToDelete.id) resetForm();
                toastActionSuccess(t('toastStockLocationDeleted'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {t('stockLocationsManagement')}
            </Typography>

            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                    <TextField
                        required
                        label={t('stockLocationCode')}
                        value={stockLocationCode}
                        onChange={(e) => setStockLocationCode(e.target.value)}
                        size="small"
                        sx={{ maxWidth: 320 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" onClick={addOrUpdateLocation} disabled={!isFormValid}>
                            {editingId ? t('updateStockLocation') : t('addStockLocation')}
                        </Button>
                        {editingId != null && (
                            <Button variant="outlined" onClick={resetForm}>
                                {t('cancel')}
                            </Button>
                        )}
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('stockLocationCode')}</TableCell>
                                <TableCell align="right">{t('stockedMaterialsCount')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedLocations.length > 0 ? (
                                sortedLocations.map((loc) => (
                                    <TableRow key={loc.id ?? loc.stockLocationCode}>
                                        <TableCell>{loc.stockLocationCode ?? '—'}</TableCell>
                                        <TableCell align="right">
                                            {loc.stockedMaterials?.length ?? 0}
                                        </TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton
                                                    size="small"
                                                    sx={tableActionIconButtonSx.edit}
                                                    onClick={() => editLocation(loc)}
                                                    title={t('edit')}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    sx={tableActionIconButtonSx.delete}
                                                    onClick={() => setLocationToDelete(loc)}
                                                    title={t('remove')}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableActionsRow>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('noStockLocations')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal
                open={!!locationToDelete}
                modalMessage={t('confirmDeleteStockLocation')}
                onConfirm={confirmDeleteLocation}
                onModalClose={() => setLocationToDelete(null)}
            />
        </Box>
    );
}
