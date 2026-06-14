import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { MachineTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { normalizeBinaryDataUrl } from 'sf-common/src/util/mediaDataUrl';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

function toNum(v: string): number | undefined {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
}

type Props = {
    open: boolean;
    machine: MachineTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function MachineFormDialog({ open, machine, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [machineName, setMachineName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [manufactureYear, setManufactureYear] = useState('');
    const [internalNumber, setInternalNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [location, setLocation] = useState('');
    const [machineImageBase64, setMachineImageBase64] = useState<string | undefined>(undefined);
    const [machineImageLoadedSrc, setMachineImageLoadedSrc] = useState<string | undefined>(undefined);
    const [machineImageInputKey, setMachineImageInputKey] = useState(0);

    useEffect(() => {
        if (!open) return;
        setMachineName(machine?.machineName ?? '');
        setManufacturer(machine?.manufacturer ?? '');
        setManufactureYear(machine?.manufactureYear != null ? String(machine.manufactureYear) : '');
        setInternalNumber(machine?.internalNumber ?? '');
        setSerialNumber(machine?.serialNumber ?? '');
        setLocation(machine?.location ?? '');
        setMachineImageBase64(undefined);
        const img = machine?.machineImageBase64?.trim();
        setMachineImageLoadedSrc(img ? normalizeBinaryDataUrl(img) : undefined);
        setMachineImageInputKey((k) => k + 1);
    }, [open, machine?.id]);

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

    const previewSrc =
        machineImageBase64 !== undefined
            ? machineImageBase64.trim() !== ''
                ? machineImageBase64
                : undefined
            : machineImageLoadedSrc;

    const handleSubmit = () => {
        const payload: MachineTO = {
            id: machine?.id,
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
            onSaved();
            onClose();
            toastActionSuccess(machine?.id ? t('toastMachineUpdated') : t('toastMachineAdded'));
        };
        if (machine?.id) {
            Server.editMachine(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addMachine(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {machine?.id ? t('editMachine') : t('addMachine')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box component="form" autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField label={t('machineName')} value={machineName} onChange={(e) => setMachineName(e.target.value)} size="small" fullWidth />
                    <TextField label={t('manufacturer')} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} size="small" fullWidth />
                    <TextField label={t('manufactureYear')} type="number" value={manufactureYear} onChange={(e) => setManufactureYear(e.target.value)} size="small" fullWidth />
                    <TextField label={t('internalNumber')} value={internalNumber} onChange={(e) => setInternalNumber(e.target.value)} size="small" fullWidth />
                    <TextField label={t('serialNumber')} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} size="small" fullWidth />
                    <TextField label={t('machineLocation')} value={location} onChange={(e) => setLocation(e.target.value)} size="small" fullWidth />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Button variant="outlined" component="label" size="small">
                                {t('machineImage')}
                                <input key={machineImageInputKey} hidden type="file" accept="image/*" onChange={(e) => { handleMachineImageFile(e.target.files); e.target.value = ''; }} />
                            </Button>
                            {previewSrc && (
                                <Button size="small" onClick={() => { setMachineImageBase64(''); setMachineImageLoadedSrc(undefined); setMachineImageInputKey((k) => k + 1); }}>
                                    {t('clearImage')}
                                </Button>
                            )}
                        </Box>
                        {previewSrc && (
                            <Box component="img" src={previewSrc} alt="" sx={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain', borderRadius: 1 }} />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {machine?.id ? t('editMachine') : t('addMachine')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
