import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderLineTO, MaterialOrderTO, MaterialProviderTO, MaterialTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

type LineDraft = { materialId?: number; quantity: string };

function newLineDraft(): LineDraft {
    return { materialId: undefined, quantity: '' };
}

type Props = {
    open: boolean;
    providers: MaterialProviderTO[];
    materials: MaterialTO[];
    onClose: () => void;
    onCreated: (saved: MaterialOrderTO) => void;
};

export function MaterialOrderCreateDialog({ open, providers, materials, onClose, onCreated }: Props) {
    const { t } = useTranslation();
    const [materialProviderId, setMaterialProviderId] = useState<number | undefined>(undefined);
    const [createLines, setCreateLines] = useState<LineDraft[]>([newLineDraft()]);

    useEffect(() => {
        if (!open) return;
        setMaterialProviderId(undefined);
        setCreateLines([newLineDraft()]);
    }, [open]);

    const materialsForProvider = useMemo(
        () =>
            materialProviderId == null
                ? []
                : materials.filter((material) =>
                      (material.providers ?? []).some((provider) => provider.id === materialProviderId),
                  ),
        [materials, materialProviderId],
    );

    const canCreate =
        materialProviderId != null &&
        createLines.length > 0 &&
        createLines.every(
            (line) =>
                line.materialId != null &&
                Number(line.quantity) > 0 &&
                Number.isFinite(Number(line.quantity)),
        ) &&
        new Set(createLines.map((line) => line.materialId).filter((id) => id != null)).size
            === createLines.filter((line) => line.materialId != null).length;

    const updateCreateLine = (index: number, patch: Partial<LineDraft>) => {
        setCreateLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    };

    const handleCreate = () => {
        if (!canCreate) return;
        const linePayload: MaterialOrderLineTO[] = createLines.map((line) => ({
            materialId: line.materialId,
            quantity: Math.trunc(Number(line.quantity)),
        }));
        Server.addMaterialOrder(
            { materialProviderId, lines: linePayload },
            (response: { data?: MaterialOrderTO }) => {
                const saved = response?.data;
                onClose();
                toastActionSuccess(t('toastMaterialOrderAdded'));
                if (saved) onCreated(saved);
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('createMaterialOrder')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                    <TextField
                        select
                        label={t('materialProviderName')}
                        value={materialProviderId ?? ''}
                        onChange={(e) => {
                            const next = e.target.value ? Number(e.target.value) : undefined;
                            setMaterialProviderId(next);
                            setCreateLines([newLineDraft()]);
                        }}
                        size="small"
                        fullWidth
                        required
                    >
                        <MenuItem value="">{t('none')}</MenuItem>
                        {providers.map((provider) => (
                            <MenuItem key={provider.id} value={provider.id}>
                                {provider.name || provider.contactPerson || provider.id}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Typography variant="subtitle2">{t('materialOrderLinesTitle')}</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('materialName')}</TableCell>
                                    <TableCell width={140}>{t('quantity')}</TableCell>
                                    <TableCell width={56} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {createLines.map((line, index) => (
                                    <TableRow key={`create-line-${index}`}>
                                        <TableCell>
                                            <TextField
                                                select
                                                value={line.materialId ?? ''}
                                                onChange={(e) => updateCreateLine(index, { materialId: e.target.value ? Number(e.target.value) : undefined })}
                                                size="small"
                                                fullWidth
                                                disabled={materialProviderId == null}
                                            >
                                                <MenuItem value="">{t('none')}</MenuItem>
                                                {materialsForProvider.map((material) => (
                                                    <MenuItem key={material.id} value={material.id}>
                                                        {material.name || material.code || material.id}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                type="number"
                                                value={line.quantity}
                                                onChange={(e) => updateCreateLine(index, { quantity: e.target.value })}
                                                size="small"
                                                fullWidth
                                                inputProps={{ min: 1, step: 1 }}
                                                disabled={materialProviderId == null}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => setCreateLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))} disabled={createLines.length <= 1} aria-label={t('removeMaterialOrderLine')}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setCreateLines((prev) => [...prev, newLineDraft()])} disabled={materialProviderId == null} sx={{ alignSelf: 'flex-start' }}>
                        {t('addMaterialOrderLine')}
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" onClick={handleCreate} disabled={!canCreate}>{t('saveAction')}</Button>
                        <Button variant="outlined" onClick={onClose}>{t('cancel')}</Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
