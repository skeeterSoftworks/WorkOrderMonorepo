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
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MachineTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';

function toNum(v: string): number | undefined {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
}

export function MachinesManagementPanel() {
    const { t } = useTranslation();

    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
    const [machineName, setMachineName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [manufactureYear, setManufactureYear] = useState('');
    const [internalNumber, setInternalNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [location, setLocation] = useState('');
    const [machineToDelete, setMachineToDelete] = useState<MachineTO | null>(null);

    useEffect(() => {
        loadMachines();
    }, []);

    const loadMachines = () => {
        Server.getAllMachines(
            (response: any) => {
                let data: MachineTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setMachines(data);
            },
            () => {},
        );
    };

    const resetForm = () => {
        setSelectedMachineId(undefined);
        setMachineName('');
        setManufacturer('');
        setManufactureYear('');
        setInternalNumber('');
        setSerialNumber('');
        setLocation('');
    };

    const handleEditClick = (machine: MachineTO) => {
        setSelectedMachineId(machine.id);
        setMachineName(machine.machineName || '');
        setManufacturer(machine.manufacturer || '');
        setManufactureYear(machine.manufactureYear != null ? String(machine.manufactureYear) : '');
        setInternalNumber(machine.internalNumber || '');
        setSerialNumber(machine.serialNumber || '');
        setLocation(machine.location || '');
    };

    const handleSubmit = () => {
        const payload: MachineTO = {
            id: selectedMachineId,
            machineName: machineName || undefined,
            manufacturer: manufacturer || undefined,
            manufactureYear: toNum(manufactureYear),
            internalNumber: internalNumber || undefined,
            serialNumber: serialNumber || undefined,
            location: location || undefined,
        };
        const onSuccess = () => {
            loadMachines();
            resetForm();
            toastActionSuccess(selectedMachineId ? t('toastMachineUpdated') : t('toastMachineAdded'));
        };
        if (selectedMachineId) {
            Server.editMachine(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addMachine(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
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
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 340, p: 2, maxHeight: '85vh', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                    {t('machinesManagement')}
                </Typography>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label={t('machineName')} value={machineName} onChange={(e) => setMachineName(e.target.value)} size="small" fullWidth />
                    <TextField label={t('manufacturer')} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} size="small" fullWidth />
                    <TextField label={t('manufactureYear')} type="number" value={manufactureYear} onChange={(e) => setManufactureYear(e.target.value)} size="small" fullWidth />
                    <TextField label={t('internalNumber')} value={internalNumber} onChange={(e) => setInternalNumber(e.target.value)} size="small" fullWidth />
                    <TextField label={t('serialNumber')} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} size="small" fullWidth />
                    <TextField label={t('machineLocation')} value={location} onChange={(e) => setLocation(e.target.value)} size="small" fullWidth />

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {selectedMachineId ? t('editMachine') : t('addMachine')}
                        </Button>
                        <Button variant="outlined" onClick={resetForm}>{t('reset')}</Button>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ flex: 2, minWidth: 400, p: 2 }}>
                <Typography variant="h6" gutterBottom>{t('machinesList')}</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('machineName')}</TableCell>
                                <TableCell>{t('manufacturer')}</TableCell>
                                <TableCell>{t('serialNumber')}</TableCell>
                                <TableCell>{t('machineLocation')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {machines.map((machine) => (
                                <TableRow key={machine.id || machine.machineName}>
                                    <TableCell>{machine.machineName}</TableCell>
                                    <TableCell>{machine.manufacturer}</TableCell>
                                    <TableCell>{machine.serialNumber}</TableCell>
                                    <TableCell>{machine.location}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(machine)}
                                                sx={tableActionIconButtonSx.edit}
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => setMachineToDelete(machine)}
                                                sx={tableActionIconButtonSx.delete}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal
                open={!!machineToDelete}
                modalMessage={t('confirmDeleteMachine')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setMachineToDelete(null)}
            />
        </Box>
    );
}
