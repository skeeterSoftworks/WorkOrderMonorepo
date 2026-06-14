import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import type { ProductTO, TechnologyTO, ToolTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { filterDecimalNumericInput } from 'sf-common/src/util/DataUtils';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';

type Props = {
    open: boolean;
    product: ProductTO | null;
    onClose: () => void;
    onSaved: () => void;
};

export function ProductTechnologyDialog({ open, product, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const [technologyDraft, setTechnologyDraft] = useState<TechnologyTO>({ tools: [] });
    const [techToolName, setTechToolName] = useState('');
    const [techToolDescription, setTechToolDescription] = useState('');
    const [techToolOrder, setTechToolOrder] = useState('');
    const [techToolWorkingTime, setTechToolWorkingTime] = useState('');
    const [editingTechnologyToolIndex, setEditingTechnologyToolIndex] = useState<number | null>(null);

    const resetTechnologyToolInputs = () => {
        setTechToolName('');
        setTechToolDescription('');
        setTechToolOrder('');
        setTechToolWorkingTime('');
        setEditingTechnologyToolIndex(null);
    };

    useEffect(() => {
        if (!open) return;
        const td = product?.technologyData;
        setTechnologyDraft({
            id: td?.id,
            cycleTime: td?.cycleTime ?? '',
            norm100: td?.norm100,
            piecesPerMaterial: td?.piecesPerMaterial,
            tools: td?.tools?.length ? td.tools.map((x) => ({ ...x })) : [],
        });
        resetTechnologyToolInputs();
    }, [open, product?.id]);

    const isTechnologyToolFormValid = (): boolean => Boolean(techToolName.trim());

    const addOrUpdateTechnologyTool = () => {
        if (!isTechnologyToolFormValid()) return;
        const orderParsed = techToolOrder.trim() === '' ? undefined : Math.trunc(Number(techToolOrder));
        const wtParsed = techToolWorkingTime.trim() === '' ? undefined : Math.trunc(Number(techToolWorkingTime));
        const row: ToolTO = {
            id: editingTechnologyToolIndex !== null
                ? technologyDraft.tools?.[editingTechnologyToolIndex]?.id
                : undefined,
            toolName: techToolName.trim(),
            toolDescription: techToolDescription.trim() || undefined,
            orderNumber:
                orderParsed !== undefined && Number.isFinite(orderParsed) ? orderParsed : undefined,
            workingTime: wtParsed !== undefined && Number.isFinite(wtParsed) ? wtParsed : undefined,
        };
        setTechnologyDraft((d) => {
            const list = [...(d.tools ?? [])];
            if (editingTechnologyToolIndex !== null) {
                list[editingTechnologyToolIndex] = row;
            } else {
                list.push(row);
            }
            return { ...d, tools: list };
        });
        resetTechnologyToolInputs();
    };

    const removeTechnologyTool = (index: number) => {
        setTechnologyDraft((d) => ({
            ...d,
            tools: (d.tools ?? []).filter((_, i) => i !== index),
        }));
        if (editingTechnologyToolIndex === index) resetTechnologyToolInputs();
        else if (editingTechnologyToolIndex !== null && editingTechnologyToolIndex > index) {
            setEditingTechnologyToolIndex(editingTechnologyToolIndex - 1);
        }
    };

    const beginEditTechnologyTool = (index: number) => {
        const row = technologyDraft.tools?.[index];
        if (!row) return;
        setEditingTechnologyToolIndex(index);
        setTechToolName(row.toolName ?? '');
        setTechToolDescription(row.toolDescription ?? '');
        setTechToolOrder(row.orderNumber != null ? String(row.orderNumber) : '');
        setTechToolWorkingTime(row.workingTime != null ? String(row.workingTime) : '');
    };

    const handleSave = () => {
        if (!product?.id) return;
        const parsedNorm100 =
            technologyDraft.norm100 === undefined || technologyDraft.norm100 === null
                ? undefined
                : Number(technologyDraft.norm100);
        if (parsedNorm100 === undefined || !Number.isFinite(parsedNorm100)) {
            return;
        }
        const parsedPieces =
            technologyDraft.piecesPerMaterial === undefined || technologyDraft.piecesPerMaterial === null
                ? undefined
                : Number(technologyDraft.piecesPerMaterial);
        const toolsPayload = (technologyDraft.tools ?? []).map((tool) => ({
            id: tool.id,
            toolName: tool.toolName?.trim() || undefined,
            toolDescription: tool.toolDescription?.trim() || undefined,
            orderNumber: tool.orderNumber,
            workingTime: tool.workingTime,
        }));
        const payload: ProductTO = {
            ...product,
            technologyData: {
                id: technologyDraft.id,
                cycleTime: technologyDraft.cycleTime?.trim() || undefined,
                norm100: Math.trunc(parsedNorm100),
                piecesPerMaterial:
                    parsedPieces !== undefined && Number.isFinite(parsedPieces)
                        ? Math.trunc(parsedPieces)
                        : undefined,
                tools: toolsPayload,
            },
        };
        Server.editProduct(
            payload,
            () => {
                onSaved();
                onClose();
                toastActionSuccess(t('toastTechnologySaved'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('technologyEditorTitle')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label={t('technologyCycleTime')}
                        value={technologyDraft.cycleTime ?? ''}
                        onChange={(e) =>
                            setTechnologyDraft((d) => ({ ...d, cycleTime: e.target.value }))
                        }
                        size="small"
                        fullWidth
                    />
                    <Tooltip title={t('technologyNorm100Tooltip')} arrow placement="top">
                        <Box sx={{ width: '100%' }}>
                            <TextField
                                required
                                label={t('technologyNorm100')}
                                value={
                                    technologyDraft.norm100 === undefined || technologyDraft.norm100 === null
                                        ? ''
                                        : String(technologyDraft.norm100)
                                }
                                onChange={(e) => {
                                    const v = e.target.value.trim();
                                    setTechnologyDraft((d) => ({
                                        ...d,
                                        norm100: v === '' ? undefined : Math.trunc(Number(v)),
                                    }));
                                }}
                                size="small"
                                fullWidth
                                inputProps={{ inputMode: 'numeric' }}
                            />
                        </Box>
                    </Tooltip>
                    <TextField
                        label={t('technologyPiecesPerMaterial')}
                        value={
                            technologyDraft.piecesPerMaterial === undefined ||
                            technologyDraft.piecesPerMaterial === null
                                ? ''
                                : String(technologyDraft.piecesPerMaterial)
                        }
                        onChange={(e) => {
                            const v = e.target.value.trim();
                            setTechnologyDraft((d) => ({
                                ...d,
                                piecesPerMaterial: v === '' ? undefined : Math.trunc(Number(v)),
                            }));
                        }}
                        size="small"
                        fullWidth
                        inputProps={{ inputMode: 'numeric' }}
                    />

                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                        {t('technologyToolsSection')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                            required
                            label={t('technologyToolName')}
                            value={techToolName}
                            onChange={(e) => setTechToolName(e.target.value)}
                            size="small"
                            sx={{ flex: '1 1 160px', minWidth: 140 }}
                        />
                        <TextField
                            label={t('technologyToolDescription')}
                            value={techToolDescription}
                            onChange={(e) => setTechToolDescription(e.target.value)}
                            size="small"
                            sx={{ flex: '2 1 220px', minWidth: 180 }}
                        />
                        <TextField
                            label={t('technologyToolOrderField')}
                            value={techToolOrder}
                            onChange={(e) => setTechToolOrder(filterDecimalNumericInput(e.target.value))}
                            size="small"
                            sx={{ width: 120 }}
                            inputProps={{ inputMode: 'numeric' }}
                        />
                        <TextField
                            label={t('technologyToolWorkingTime')}
                            value={techToolWorkingTime}
                            onChange={(e) => setTechToolWorkingTime(filterDecimalNumericInput(e.target.value))}
                            size="small"
                            sx={{ width: 120 }}
                            inputProps={{ inputMode: 'numeric' }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={addOrUpdateTechnologyTool}
                            disabled={!isTechnologyToolFormValid()}
                        >
                            {editingTechnologyToolIndex !== null
                                ? t('technologyToolUpdate')
                                : t('addTechnologyTool')}
                        </Button>
                        {editingTechnologyToolIndex !== null && (
                            <Button variant="text" onClick={resetTechnologyToolInputs}>
                                {t('cancel')}
                            </Button>
                        )}
                    </Box>

                    <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('technologyToolName')}</TableCell>
                                <TableCell>{t('technologyToolDescription')}</TableCell>
                                <TableCell>{t('technologyToolOrderField')}</TableCell>
                                <TableCell>{t('technologyToolWorkingTime')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(technologyDraft.tools ?? []).length > 0 ? (
                                (technologyDraft.tools ?? []).map((tool, idx) => (
                                    <TableRow key={tool.id ?? `new-tool-${idx}`}>
                                        <TableCell>{tool.toolName ?? '—'}</TableCell>
                                        <TableCell>{tool.toolDescription ?? '—'}</TableCell>
                                        <TableCell>{tool.orderNumber ?? '—'}</TableCell>
                                        <TableCell>{tool.workingTime ?? '—'}</TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => beginEditTechnologyTool(idx)}
                                                    sx={tableActionIconButtonSx.edit}
                                                    title={t('edit')}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeTechnologyTool(idx)}
                                                    sx={tableActionIconButtonSx.delete}
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
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('technologyToolsEmpty')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={
                                technologyDraft.norm100 == null ||
                                !Number.isFinite(Number(technologyDraft.norm100))
                            }
                        >
                            {t('technologySave')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
