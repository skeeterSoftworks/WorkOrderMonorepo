import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MachineTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { MachineFormDialog } from './MachineFormDialog';

function parseProductsResponse(response: unknown): ProductTO[] {
    const r = response as { data?: ProductTO[] | { data?: ProductTO[] } };
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

export function MachinesManagementPanel() {
    const { t } = useTranslation();
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [editingMachine, setEditingMachine] = useState<MachineTO | null>(null);
    const [machineToDelete, setMachineToDelete] = useState<MachineTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const linkedMachineIds = useMemo(() => {
        const s = new Set<number>();
        for (const p of products) {
            for (const id of p.machineIds ?? []) {
                if (typeof id === 'number' && Number.isFinite(id)) s.add(id);
            }
        }
        return s;
    }, [products]);

    useEffect(() => {
        loadMachines();
        loadProducts();
    }, []);

    const loadMachines = () => {
        Server.getAllMachines(
            (response: unknown) => {
                const r = response as { data?: MachineTO[] | { data?: MachineTO[] } };
                let data: MachineTO[] = [];
                if (Array.isArray(r?.data)) data = r.data;
                else if (Array.isArray(r?.data?.data)) data = r.data.data;
                setMachines(data);
            },
            () => {},
        );
    };

    const loadProducts = () => {
        Server.getAllProducts(
            (response: unknown) => setProducts(parseProductsResponse(response)),
            () => {},
        );
    };

    const handleConfirmDelete = () => {
        if (!machineToDelete?.id) {
            setMachineToDelete(null);
            return;
        }
        Server.deleteMachine(
            Number(machineToDelete.id),
            () => {
                loadMachines();
                loadProducts();
                setMachineToDelete(null);
                toastActionSuccess(t('toastMachineDeleted'));
            },
            (err: unknown) => {
                setMachineToDelete(null);
                toastServerError(err, t);
            },
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('machinesManagement')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => { setEditingMachine(null); setFormModalOpen(true); }}>
                    {t('addMachine')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('machineName')}</TableCell>
                                <TableCell>{t('manufacturer')}</TableCell>
                                <TableCell>{t('serialNumber')}</TableCell>
                                <TableCell>{t('machineLocation')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {machines.map((machine) => {
                                const mid = machine.id;
                                const unlinked = mid != null && !linkedMachineIds.has(mid);
                                const noImage = !machine.machineImageBase64?.trim();
                                return (
                                    <TableRow key={machine.id ?? machine.machineName}>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                                <span>{machine.machineName}</span>
                                                {unlinked && (
                                                    <Tooltip title={t('machineNoProductsLinkedHint')}>
                                                        <Chip size="small" label={t('machineNoProductsBadge')} color="warning" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }} />
                                                    </Tooltip>
                                                )}
                                                {noImage && (
                                                    <Tooltip title={t('machineNoImageHint')}>
                                                        <Chip size="small" label={t('machineNoImageBadge')} color="default" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }} />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{machine.manufacturer}</TableCell>
                                        <TableCell>{machine.serialNumber}</TableCell>
                                        <TableCell>{machine.location}</TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton size="small" onClick={() => { setEditingMachine(machine); setFormModalOpen(true); }} sx={tableActionIconButtonSx.edit} title={t('editMachine')}>
                                                    <LinkIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => setMachineToDelete(machine)} sx={tableActionIconButtonSx.delete}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableActionsRow>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <MachineFormDialog
                open={formModalOpen}
                machine={editingMachine}
                onClose={() => { setFormModalOpen(false); setEditingMachine(null); }}
                onSaved={() => { loadMachines(); loadProducts(); }}
            />

            <ConfirmationModal open={!!machineToDelete} modalMessage={t('confirmDeleteMachine')} onConfirm={handleConfirmDelete} onModalClose={() => setMachineToDelete(null)} />
        </Box>
    );
}
