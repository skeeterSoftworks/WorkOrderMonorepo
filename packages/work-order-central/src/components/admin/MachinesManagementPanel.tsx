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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {MachineTO, ProductTO} from 'sf-common/src/models/ApiRequests';
import {Server, ConfirmationModal} from 'sf-common';
import {normalizeBinaryDataUrl} from 'sf-common/src/util/mediaDataUrl';
import {toastActionSuccess, toastServerError} from '../../util/actionToast';
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

function parseProductsResponse(response: unknown): ProductTO[] {
    const r = response as {data?: ProductTO[] | {data?: ProductTO[]}};
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

export function MachinesManagementPanel() {
    const {t} = useTranslation();

    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
    const [machineName, setMachineName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [manufactureYear, setManufactureYear] = useState('');
    const [internalNumber, setInternalNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [location, setLocation] = useState('');
    const [machineToDelete, setMachineToDelete] = useState<MachineTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    /** `undefined` = unchanged on save when editing; `''` = clear. */
    const [machineImageBase64, setMachineImageBase64] = useState<string | undefined>(undefined);
    const [machineImageLoadedSrc, setMachineImageLoadedSrc] = useState<string | undefined>(undefined);
    const [machineImageInputKey, setMachineImageInputKey] = useState(0);

    const linkedMachineIds = useMemo(() => {
        const s = new Set<number>();
        for (const p of products) {
            for (const id of p.machineIds ?? []) {
                if (typeof id === 'number' && Number.isFinite(id)) {
                    s.add(id);
                }
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
                const r = response as {data?: MachineTO[] | {data?: MachineTO[]}};
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
            (response: unknown) => {
                setProducts(parseProductsResponse(response));
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
        setMachineImageBase64(undefined);
        setMachineImageLoadedSrc(undefined);
        setMachineImageInputKey((k) => k + 1);
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        resetForm();
    };

    const handleEditClick = (machine: MachineTO) => {
        setSelectedMachineId(machine.id);
        setMachineName(machine.machineName || '');
        setManufacturer(machine.manufacturer || '');
        setManufactureYear(machine.manufactureYear != null ? String(machine.manufactureYear) : '');
        setInternalNumber(machine.internalNumber || '');
        setSerialNumber(machine.serialNumber || '');
        setLocation(machine.location || '');
        setMachineImageBase64(undefined);
        const img = machine.machineImageBase64?.trim();
        setMachineImageLoadedSrc(img ? normalizeBinaryDataUrl(img) : undefined);
        setMachineImageInputKey((k) => k + 1);
        setFormModalOpen(true);
    };

    const handleMachineImageFile = (fileList: FileList | null) => {
        const file = fileList?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result;
            if (typeof r === 'string') setMachineImageBase64(r);
        };
        reader.readAsDataURL(file);
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
        if (machineImageBase64 !== undefined) {
            payload.machineImageBase64 = machineImageBase64.length > 0 ? machineImageBase64 : '';
        }
        const onSuccess = () => {
            loadMachines();
            loadProducts();
            closeFormModal();
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
        <Box sx={{mt: 3}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h6">{t('machinesManagement')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openFormModal}>
                    {t('addMachine')}
                </Button>
            </Box>

            <Paper sx={{p: 2}}>
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
                                                        <Chip
                                                            size="small"
                                                            label={t('machineNoProductsBadge')}
                                                            color="warning"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 22,
                                                                '& .MuiChip-label': {px: 1, fontSize: '0.7rem'},
                                                            }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {noImage && (
                                                    <Tooltip title={t('machineNoImageHint')}>
                                                        <Chip
                                                            size="small"
                                                            label={t('machineNoImageBadge')}
                                                            color="default"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 22,
                                                                '& .MuiChip-label': {px: 1, fontSize: '0.7rem'},
                                                            }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{machine.manufacturer}</TableCell>
                                        <TableCell>{machine.serialNumber}</TableCell>
                                        <TableCell>{machine.location}</TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditClick(machine)}
                                                    sx={tableActionIconButtonSx.edit}
                                                    title={t('editMachine')}
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
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={formModalOpen} onClose={closeFormModal} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    {selectedMachineId ? t('editMachine') : t('addMachine')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
                        <TextField
                            label={t('machineName')}
                            value={machineName}
                            onChange={(e) => setMachineName(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('manufacturer')}
                            value={manufacturer}
                            onChange={(e) => setManufacturer(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('manufactureYear')}
                            type="number"
                            value={manufactureYear}
                            onChange={(e) => setManufactureYear(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('internalNumber')}
                            value={internalNumber}
                            onChange={(e) => setInternalNumber(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('serialNumber')}
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('machineLocation')}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
                                <Button variant="outlined" component="label" size="small">
                                    {t('machineImage')}
                                    <input
                                        key={machineImageInputKey}
                                        hidden
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            handleMachineImageFile(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                {(() => {
                                    const previewSrc =
                                        machineImageBase64 !== undefined
                                            ? machineImageBase64.trim() !== ''
                                                ? machineImageBase64
                                                : undefined
                                            : machineImageLoadedSrc;
                                    return previewSrc ? (
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setMachineImageBase64('');
                                                setMachineImageLoadedSrc(undefined);
                                                setMachineImageInputKey((k) => k + 1);
                                            }}
                                        >
                                            {t('clearImage')}
                                        </Button>
                                    ) : null;
                                })()}
                            </Box>
                            {(() => {
                                const previewSrc =
                                    machineImageBase64 !== undefined
                                        ? machineImageBase64.trim() !== ''
                                            ? machineImageBase64
                                            : undefined
                                        : machineImageLoadedSrc;
                                if (!previewSrc) return null;
                                return (
                                    <Box
                                        component="img"
                                        src={previewSrc}
                                        alt=""
                                        sx={{maxHeight: 200, maxWidth: '100%', objectFit: 'contain', borderRadius: 1}}
                                    />
                                );
                            })()}
                        </Box>
                        <Box sx={{display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap'}}>
                            <Button variant="contained" color="primary" onClick={handleSubmit}>
                                {selectedMachineId ? t('editMachine') : t('addMachine')}
                            </Button>
                            <Button variant="outlined" onClick={closeFormModal}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!machineToDelete}
                modalMessage={t('confirmDeleteMachine')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setMachineToDelete(null)}
            />
        </Box>
    );
}
