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
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MachineTO, ToolTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
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
    const [cycleTime, setCycleTime] = useState('');
    const [barLocation, setBarLocation] = useState('');
    const [piecesPerBar, setPiecesPerBar] = useState('');
    const [barsPerSeries, setBarsPerSeries] = useState('');
    const [barsCount, setBarsCount] = useState('');
    const [weightPerBar, setWeightPerBar] = useState('');
    const [sumBarWeight, setSumBarWeight] = useState('');
    const [seriesID, setSeriesID] = useState('');
    const [tools, setTools] = useState<{ id?: number; toolName: string; toolDescription: string }[]>([]);
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
        setCycleTime('');
        setBarLocation('');
        setPiecesPerBar('');
        setBarsPerSeries('');
        setBarsCount('');
        setWeightPerBar('');
        setSumBarWeight('');
        setSeriesID('');
        setTools([]);
    };

    const addToolRow = () => {
        setTools((prev) => [...prev, { toolName: '', toolDescription: '' }]);
    };

    const removeToolRow = (index: number) => {
        setTools((prev) => prev.filter((_, i) => i !== index));
    };

    const updateToolRow = (index: number, field: 'toolName' | 'toolDescription', value: string) => {
        setTools((prev) =>
            prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
        );
    };

    const handleEditClick = (machine: MachineTO) => {
        setSelectedMachineId(machine.id);
        setMachineName(machine.machineName || '');
        setCycleTime(machine.cycleTime != null ? String(machine.cycleTime) : '');
        setBarLocation(machine.barLocation || '');
        setPiecesPerBar(machine.piecesPerBar != null ? String(machine.piecesPerBar) : '');
        setBarsPerSeries(machine.barsPerSeries != null ? String(machine.barsPerSeries) : '');
        setBarsCount(machine.barsCount != null ? String(machine.barsCount) : '');
        setWeightPerBar(machine.weightPerBar != null ? String(machine.weightPerBar) : '');
        setSumBarWeight(machine.sumBarWeight != null ? String(machine.sumBarWeight) : '');
        setSeriesID(machine.seriesID || '');
        setTools(
            (machine.tools || []).map((t) => ({
                id: t.id,
                toolName: t.toolName || '',
                toolDescription: t.toolDescription || '',
            })),
        );
    };

    const handleSubmit = () => {
        const toolList: ToolTO[] = tools.map((t) => ({
            id: t.id,
            toolName: t.toolName || undefined,
            toolDescription: t.toolDescription || undefined,
        }));
        const payload: MachineTO = {
            id: selectedMachineId,
            machineName: machineName || undefined,
            cycleTime: toNum(cycleTime),
            barLocation: barLocation || undefined,
            piecesPerBar: toNum(piecesPerBar),
            barsPerSeries: toNum(barsPerSeries),
            barsCount: toNum(barsCount),
            weightPerBar: toNum(weightPerBar),
            sumBarWeight: toNum(sumBarWeight),
            seriesID: seriesID || undefined,
            tools: toolList,
        };
        const onSuccess = () => {
            loadMachines();
            resetForm();
        };
        if (selectedMachineId) {
            Server.editMachine(payload, onSuccess, () => {});
        } else {
            Server.addMachine(payload, onSuccess, () => {});
        }
    };

    const handleConfirmDelete = () => {
        if (!machineToDelete?.id) {
            setMachineToDelete(null);
            return;
        }
        Server.deleteMachine(Number(machineToDelete.id), () => {
            loadMachines();
            setMachineToDelete(null);
        }, () => setMachineToDelete(null));
    };

    return (
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 340, p: 2, maxHeight: '85vh', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                    {t('machinesManagement')}
                </Typography>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label={t('machineName')} value={machineName} onChange={(e) => setMachineName(e.target.value)} size="small" fullWidth />
                    <TextField label={t('cycleTime')} type="number" value={cycleTime} onChange={(e) => setCycleTime(e.target.value)} size="small" fullWidth />
                    <TextField label={t('barLocation')} value={barLocation} onChange={(e) => setBarLocation(e.target.value)} size="small" fullWidth />
                    <TextField label={t('piecesPerBar')} type="number" value={piecesPerBar} onChange={(e) => setPiecesPerBar(e.target.value)} size="small" fullWidth />
                    <TextField label={t('barsPerSeries')} type="number" value={barsPerSeries} onChange={(e) => setBarsPerSeries(e.target.value)} size="small" fullWidth />
                    <TextField label={t('barsCount')} type="number" value={barsCount} onChange={(e) => setBarsCount(e.target.value)} size="small" fullWidth />
                    <TextField label={t('weightPerBar')} type="number" value={weightPerBar} onChange={(e) => setWeightPerBar(e.target.value)} size="small" fullWidth />
                    <TextField label={t('sumBarWeight')} type="number" value={sumBarWeight} onChange={(e) => setSumBarWeight(e.target.value)} size="small" fullWidth />
                    <TextField label={t('seriesID')} value={seriesID} onChange={(e) => setSeriesID(e.target.value)} size="small" fullWidth />

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('tools')}</Typography>
                    {tools.map((tool, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                            <TextField label={t('toolName')} value={tool.toolName} onChange={(e) => updateToolRow(index, 'toolName', e.target.value)} size="small" sx={{ flex: 1, minWidth: 120 }} />
                            <TextField label={t('toolDescription')} value={tool.toolDescription} onChange={(e) => updateToolRow(index, 'toolDescription', e.target.value)} size="small" sx={{ flex: 1, minWidth: 120 }} />
                            <IconButton
                                size="small"
                                onClick={() => removeToolRow(index)}
                                aria-label={t('remove')}
                                sx={tableActionIconButtonSx.delete}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addToolRow}>
                        {t('addTool')}
                    </Button>

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
                                <TableCell>{t('seriesID')}</TableCell>
                                <TableCell align="right">{t('toolsCount')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {machines.map((machine) => (
                                <TableRow key={machine.id || machine.machineName}>
                                    <TableCell>{machine.machineName}</TableCell>
                                    <TableCell>{machine.seriesID}</TableCell>
                                    <TableCell align="right">{machine.tools?.length ?? 0}</TableCell>
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
