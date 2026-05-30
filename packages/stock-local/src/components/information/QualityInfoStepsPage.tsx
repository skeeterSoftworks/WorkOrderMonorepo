import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Server } from '../../api/Server.ts';
import type { BoundMachineProductTO, QualityInfoStepTO, WorkstationMachineConfigTO } from '../../models/ApiRequests.ts';
import { isPdfDataUrl, normalizeBinaryDataUrl } from 'sf-common/src/util/mediaDataUrl';

function withSequentialStepNumbers(steps: QualityInfoStepTO[]): QualityInfoStepTO[] {
    return steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
}

export function QualityInfoStepsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [configReady, setConfigReady] = useState<boolean | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [products, setProducts] = useState<BoundMachineProductTO[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    const [qualityInfoSteps, setQualityInfoSteps] = useState<QualityInfoStepTO[]>([]);
    const [qiStepDescription, setQiStepDescription] = useState('');
    const [qiImageBase64, setQiImageBase64] = useState<string | undefined>(undefined);
    const [editingQualityStepIndex, setEditingQualityStepIndex] = useState<number | null>(null);
    const [qiImageInputKey, setQiImageInputKey] = useState(0);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cfg = await new Promise<WorkstationMachineConfigTO>((resolve, reject) => {
                    Server.getWorkstationMachine(
                        (response: { data: WorkstationMachineConfigTO }) => resolve(response.data),
                        reject,
                    );
                });
                const id = cfg?.machineId;
                const name = cfg?.machineName?.trim();
                if (cancelled) return;
                if ((id != null && id > 0) || (name && name.length > 0)) {
                    setConfigReady(true);
                } else {
                    setConfigReady(false);
                }
            } catch {
                if (!cancelled) setConfigReady(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const loadProducts = useCallback(() => {
        setLoadingList(true);
        setLoadError(null);
        Server.getBoundMachineProducts()
            .then((list) => {
                setProducts(list);
            })
            .catch(() => {
                setLoadError(t('qualityInfoStepsLoadError'));
                setProducts([]);
            })
            .finally(() => setLoadingList(false));
    }, [t]);

    useEffect(() => {
        if (configReady !== true) return;
        void loadProducts();
    }, [configReady, loadProducts]);

    const resetQualityStepInputs = () => {
        setQiStepDescription('');
        setQiImageBase64(undefined);
        setEditingQualityStepIndex(null);
        setQiImageInputKey((k) => k + 1);
    };

    const handleQiImageFile = (fileList: FileList | null) => {
        const file = fileList?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result;
            if (typeof r === 'string') setQiImageBase64(r);
        };
        reader.readAsDataURL(file);
    };

    const addOrUpdateQualityInfoStep = () => {
        const desc = qiStepDescription.trim();
        const hasImage = qiImageBase64 !== undefined && qiImageBase64.length > 0;
        if (!desc && !hasImage) return;

        const prev =
            editingQualityStepIndex !== null ? qualityInfoSteps[editingQualityStepIndex] : undefined;
        const step: QualityInfoStepTO = {
            id: prev?.id,
            stepDescription: desc || undefined,
        };
        if (qiImageBase64 !== undefined) {
            step.imageDataBase64 = qiImageBase64;
        } else if (prev?.imageDataBase64) {
            step.imageDataBase64 = prev.imageDataBase64;
        }

        if (editingQualityStepIndex !== null) {
            setQualityInfoSteps((list) => {
                const next = list.map((s, i) => (i === editingQualityStepIndex ? step : s));
                return withSequentialStepNumbers(next);
            });
        } else {
            setQualityInfoSteps((list) => withSequentialStepNumbers([...list, step]));
        }
        resetQualityStepInputs();
    };

    const removeQualityInfoStep = (index: number) => {
        setQualityInfoSteps((list) => withSequentialStepNumbers(list.filter((_, i) => i !== index)));
        if (editingQualityStepIndex === index) resetQualityStepInputs();
        else if (editingQualityStepIndex !== null && editingQualityStepIndex > index) {
            setEditingQualityStepIndex(editingQualityStepIndex - 1);
        }
    };

    const moveQualityInfoStep = (index: number, direction: 'up' | 'down') => {
        const delta = direction === 'up' ? -1 : 1;
        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= qualityInfoSteps.length) return;
        setQualityInfoSteps((list) => {
            const next = [...list];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return withSequentialStepNumbers(next);
        });
        setEditingQualityStepIndex((cur) => {
            if (cur === null) return null;
            if (cur === index) return newIndex;
            if (cur === newIndex) return index;
            return cur;
        });
    };

    const beginEditQualityInfoStep = (index: number) => {
        const s = qualityInfoSteps[index];
        if (!s) return;
        setEditingQualityStepIndex(index);
        setQiStepDescription(s.stepDescription ?? '');
        setQiImageBase64(undefined);
        setQiImageInputKey((k) => k + 1);
    };

    const onProductChange = (productId: number) => {
        setSelectedProductId(productId);
        const p = products.find((x) => x.id === productId);
        const loaded = (p?.qualityInfoSteps ?? []).slice();
        loaded.sort((a, b) => (a.stepNumber ?? 1e9) - (b.stepNumber ?? 1e9));
        setQualityInfoSteps(withSequentialStepNumbers(loaded));
        resetQualityStepInputs();
    };

    const handleSave = async () => {
        if (selectedProductId === '' || typeof selectedProductId !== 'number') return;
        setSaving(true);
        try {
            const updated = await Server.putBoundMachineProductQualityInfoSteps(
                selectedProductId,
                qualityInfoSteps,
            );
            setProducts((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, qualityInfoSteps: updated.qualityInfoSteps } : p)),
            );
            const sorted = (updated.qualityInfoSteps ?? []).slice();
            sorted.sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));
            setQualityInfoSteps(withSequentialStepNumbers(sorted));
        } catch {
            /* error toast from Server */
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        onClick={() => navigate('/')}
                        sx={{ mr: 1 }}
                        aria-label={t('backToHome')}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">{t('qualityInfoStepsPage')}</Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{ mt: 3 }}>
                {configReady === false && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('qualityInfoStepsWorkstationRequired')}
                    </Alert>
                )}
                {configReady === true && loadError && <Alert severity="error">{loadError}</Alert>}
                {configReady === true && !loadError && (
                    <Stack spacing={2}>
                        {loadingList ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={24} />
                                <Typography variant="body2" color="text.secondary">
                                    {t('qualityInfoStepsLoading')}
                                </Typography>
                            </Box>
                        ) : (
                            <TextField
                                select
                                label={t('qualityInfoStepsSelectProduct')}
                                value={selectedProductId === '' ? '' : selectedProductId}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') {
                                        setSelectedProductId('');
                                        setQualityInfoSteps([]);
                                        resetQualityStepInputs();
                                        return;
                                    }
                                    onProductChange(Number(v));
                                }}
                                size="small"
                                fullWidth
                                sx={{ maxWidth: 560 }}
                                disabled={products.length === 0}
                                helperText={products.length === 0 ? t('qualityInfoStepsNoProducts') : undefined}
                            >
                                <MenuItem value="">{t('qualityInfoStepsSelectPlaceholder')}</MenuItem>
                                {products
                                    .filter((p): p is BoundMachineProductTO & { id: number } => p.id != null && p.id > 0)
                                    .map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name ?? '—'}
                                            {p.reference ? ` (${p.reference})` : ` (#${p.id})`}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        )}

                        {selectedProductId !== '' && (
                            <>
                                <Typography variant="body2" color="text.secondary">
                                    {t('qualityInfoStepsEditorHint')}
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Button variant="outlined" component="label" size="small">
                                            {t('qualityStepImage')}
                                            <input
                                                key={qiImageInputKey}
                                                hidden
                                                type="file"
                                                accept="image/*,application/pdf,.pdf"
                                                onChange={(e) => {
                                                    handleQiImageFile(e.target.files);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </Button>
                                        {(Boolean(qiImageBase64 && qiImageBase64.length > 0) ||
                                            (editingQualityStepIndex !== null &&
                                                Boolean(
                                                    qualityInfoSteps[editingQualityStepIndex]?.imageDataBase64,
                                                ))) && (
                                            <Button size="small" onClick={() => setQiImageBase64('')}>
                                                {t('clearImage')}
                                            </Button>
                                        )}
                                    </Box>
                                    {(() => {
                                        const qiRaw =
                                            qiImageBase64 && qiImageBase64.length > 0
                                                ? qiImageBase64
                                                : editingQualityStepIndex !== null && qiImageBase64 === undefined
                                                  ? qualityInfoSteps[editingQualityStepIndex]?.imageDataBase64
                                                  : undefined;
                                        const qiUrl = qiRaw ? normalizeBinaryDataUrl(qiRaw, 'image/png') : undefined;
                                        if (!qiUrl) return null;
                                        return isPdfDataUrl(qiUrl) ? (
                                            <Box
                                                component="iframe"
                                                title=""
                                                src={qiUrl}
                                                sx={{
                                                    maxHeight: 180,
                                                    minHeight: 100,
                                                    width: '100%',
                                                    border: 'none',
                                                    borderRadius: 1,
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                component="img"
                                                alt=""
                                                src={qiUrl}
                                                sx={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }}
                                            />
                                        );
                                    })()}
                                    <TextField
                                        label={t('description')}
                                        value={qiStepDescription}
                                        onChange={(e) => setQiStepDescription(e.target.value)}
                                        size="small"
                                        fullWidth
                                        multiline
                                        minRows={2}
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            startIcon={<AddIcon />}
                                            onClick={addOrUpdateQualityInfoStep}
                                            disabled={
                                                !qiStepDescription.trim() &&
                                                !(qiImageBase64 !== undefined && qiImageBase64.length > 0) &&
                                                !(
                                                    editingQualityStepIndex !== null &&
                                                    Boolean(
                                                        qualityInfoSteps[editingQualityStepIndex]?.stepDescription?.trim() ||
                                                            qualityInfoSteps[editingQualityStepIndex]?.imageDataBase64,
                                                    )
                                                )
                                            }
                                        >
                                            {editingQualityStepIndex !== null
                                                ? t('updateQualityInfoStep')
                                                : t('addQualityInfoStep')}
                                        </Button>
                                        {editingQualityStepIndex !== null && (
                                            <Button variant="text" onClick={resetQualityStepInputs}>
                                                {t('cancel')}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>

                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell align="center" sx={{ width: 48 }}>
                                                {t('reorderSteps')}
                                            </TableCell>
                                            <TableCell>{t('stepNumber')}</TableCell>
                                            <TableCell>{t('description')}</TableCell>
                                            <TableCell>{t('qualityStepImage')}</TableCell>
                                            <TableCell align="right">{t('actions')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {qualityInfoSteps.length > 0 ? (
                                            qualityInfoSteps.map((s, idx) => (
                                                <TableRow key={`${s.id ?? 'new'}-qi-${idx}`}>
                                                    <TableCell padding="checkbox" sx={{ verticalAlign: 'middle' }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                width: 40,
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveQualityInfoStep(idx, 'up')}
                                                                disabled={idx === 0}
                                                                aria-label={t('moveUp')}
                                                            >
                                                                <KeyboardArrowUpIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => moveQualityInfoStep(idx, 'down')}
                                                                disabled={idx === qualityInfoSteps.length - 1}
                                                                aria-label={t('moveDown')}
                                                            >
                                                                <KeyboardArrowDownIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>{s.stepNumber ?? idx + 1}</TableCell>
                                                    <TableCell>{s.stepDescription ?? '—'}</TableCell>
                                                    <TableCell>
                                                        {s.imageDataBase64 ? (
                                                            (() => {
                                                                const u = normalizeBinaryDataUrl(s.imageDataBase64, 'image/png');
                                                                if (!u) return '—';
                                                                return isPdfDataUrl(u) ? (
                                                                    <Box
                                                                        component="iframe"
                                                                        title=""
                                                                        src={u}
                                                                        sx={{
                                                                            height: 52,
                                                                            width: 72,
                                                                            border: 'none',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Box
                                                                        component="img"
                                                                        alt=""
                                                                        src={u}
                                                                        sx={{
                                                                            maxHeight: 48,
                                                                            maxWidth: 80,
                                                                            objectFit: 'contain',
                                                                        }}
                                                                    />
                                                                );
                                                            })()
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => beginEditQualityInfoStep(idx)}
                                                            aria-label={t('edit')}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeQualityInfoStep(idx)}
                                                            aria-label={t('remove')}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {t('none')}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                <Button
                                    variant="contained"
                                    onClick={() => void handleSave()}
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
                                >
                                    {t('save')}
                                </Button>
                            </>
                        )}
                    </Stack>
                )}
            </Box>
        </Container>
    );
}
