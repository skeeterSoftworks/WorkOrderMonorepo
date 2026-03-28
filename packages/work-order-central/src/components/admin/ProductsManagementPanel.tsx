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
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import type {
    ProductTO,
    MachineTO,
    MeasuringFeaturePrototypeTO,
    QualityInfoStepTO,
} from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';

type LocalProduct = ProductTO;

function withSequentialStepNumbers(steps: QualityInfoStepTO[]): QualityInfoStepTO[] {
    return steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
}

export function ProductsManagementPanel() {
    const { t } = useTranslation();

    const [products, setProducts] = useState<LocalProduct[]>([]);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [selectedMachineIds, setSelectedMachineIds] = useState<number[]>([]);
    const [productToDelete, setProductToDelete] = useState<LocalProduct | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const [measuringFeaturePrototypes, setMeasuringFeaturePrototypes] = useState<MeasuringFeaturePrototypeTO[]>(
        []
    );

    // "Add new prototype" form state (added to `measuringFeaturePrototypes` list).
    const [protoCatalogueId, setProtoCatalogueId] = useState('');
    const [protoDescription, setProtoDescription] = useState('');
    const [protoAbsoluteMeasure, setProtoAbsoluteMeasure] = useState(false);
    const [protoRefValue, setProtoRefValue] = useState<number | ''>('');
    const [protoMinTolerance, setProtoMinTolerance] = useState<number | ''>('');
    const [protoMaxTolerance, setProtoMaxTolerance] = useState<number | ''>('');
    const [protoClassType, setProtoClassType] = useState<string>('');
    const [protoFrequency, setProtoFrequency] = useState('');
    const [protoCheckType, setProtoCheckType] = useState<'ATTRIBUTIVE' | 'MEASURED' | ''>('');
    const [protoToolType, setProtoToolType] = useState('');
    const [protoMeasuringTool, setProtoMeasuringTool] = useState('');

    const [qualityInfoSteps, setQualityInfoSteps] = useState<QualityInfoStepTO[]>([]);
    const [qiStepDescription, setQiStepDescription] = useState('');
    /** Set when user picks/clears image; `undefined` means “keep existing” while editing. */
    const [qiImageBase64, setQiImageBase64] = useState<string | undefined>(undefined);
    const [editingQualityStepIndex, setEditingQualityStepIndex] = useState<number | null>(null);
    const [qiImageInputKey, setQiImageInputKey] = useState(0);

    /** `undefined` = unchanged on save; data URL or raw base64 when user picks file; `''` = clear. */
    const [technicalDrawingBase64, setTechnicalDrawingBase64] = useState<string | undefined>(undefined);
    /** Server value for preview only when `technicalDrawingBase64` is `undefined`. */
    const [technicalDrawingLoadedSrc, setTechnicalDrawingLoadedSrc] = useState<string | undefined>(undefined);
    const [technicalDrawingInputKey, setTechnicalDrawingInputKey] = useState(0);

    useEffect(() => {
        loadProducts();
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

    const loadProducts = () => {
        Server.getAllProducts(
            (response: any) => {
                let data: LocalProduct[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setProducts(data);
            },
            () => {},
        );
    };

    const resetForm = () => {
        setSelectedProductId(undefined);
        setName('');
        setDescription('');
        setReference('');
        setSelectedMachineIds([]);

        setMeasuringFeaturePrototypes([]);
        setProtoCatalogueId('');
        setProtoDescription('');
        setProtoAbsoluteMeasure(false);
        setProtoRefValue('');
        setProtoMinTolerance('');
        setProtoMaxTolerance('');
        setProtoClassType('');
        setProtoFrequency('');
        setProtoCheckType('');
        setProtoToolType('');
        setProtoMeasuringTool('');

        setQualityInfoSteps([]);
        setQiStepDescription('');
        setQiImageBase64(undefined);
        setEditingQualityStepIndex(null);
        setQiImageInputKey((k) => k + 1);

        setTechnicalDrawingBase64(undefined);
        setTechnicalDrawingLoadedSrc(undefined);
        setTechnicalDrawingInputKey((k) => k + 1);
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const handleMachineIdsChange = (value: unknown) => {
        const ids = Array.isArray(value) ? value : [value];
        setSelectedMachineIds(ids.filter((v): v is number => typeof v === 'number'));
    };

    const resetPrototypeInputs = () => {
        setProtoCatalogueId('');
        setProtoDescription('');
        setProtoAbsoluteMeasure(false);
        setProtoRefValue('');
        setProtoMinTolerance('');
        setProtoMaxTolerance('');
        setProtoClassType('');
        setProtoFrequency('');
        setProtoCheckType('');
        setProtoToolType('');
        setProtoMeasuringTool('');
    };

    const resetQualityStepInputs = () => {
        setQiStepDescription('');
        setQiImageBase64(undefined);
        setEditingQualityStepIndex(null);
        setQiImageInputKey((k) => k + 1);
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

    const addMeasuringFeaturePrototype = () => {
        const catalogueId = protoCatalogueId.trim();
        const desc = protoDescription.trim();
        if (!catalogueId || !desc) return;

        const isAttributive = protoCheckType === 'ATTRIBUTIVE';
        const toAdd: MeasuringFeaturePrototypeTO = {
            id: undefined,
            catalogueId,
            description: desc,
            absoluteMeasure: protoAbsoluteMeasure,
            refValue: isAttributive || protoRefValue === '' ? undefined : protoRefValue,
            minTolerance: isAttributive || protoMinTolerance === '' ? undefined : protoMinTolerance,
            maxTolerance: isAttributive || protoMaxTolerance === '' ? undefined : protoMaxTolerance,
            classType: protoClassType || undefined,
            frequency: protoFrequency.trim() || undefined,
            checkType: protoCheckType || undefined,
            toolType: protoToolType.trim() || undefined,
            measuringTool: protoMeasuringTool.trim() || undefined,
        };

        setMeasuringFeaturePrototypes((prev) => [...prev, toAdd]);
        resetPrototypeInputs();
    };

    const removeMeasuringFeaturePrototype = (index: number) => {
        setMeasuringFeaturePrototypes((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEditClick = (product: LocalProduct) => {
        setSelectedProductId(product.id as number | undefined);
        setName(product.name || '');
        setDescription(product.description || '');
        setReference(product.reference || '');
        setSelectedMachineIds(product.machineIds ?? []);
        setMeasuringFeaturePrototypes(product.measuringFeaturePrototypes ?? []);
        resetPrototypeInputs();
        const loadedQi = (product.qualityInfoSteps ?? [])
            .slice()
            .sort((a, b) => (a.stepNumber ?? 1e9) - (b.stepNumber ?? 1e9));
        setQualityInfoSteps(withSequentialStepNumbers(loadedQi));
        resetQualityStepInputs();
        const td = product.technicalDrawingBase64?.trim();
        setTechnicalDrawingBase64(undefined);
        setTechnicalDrawingLoadedSrc(
            td ? (td.startsWith('data:') ? td : `data:image/jpeg;base64,${td}`) : undefined
        );
        setTechnicalDrawingInputKey((k) => k + 1);
        setFormModalOpen(true);
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

    const handleTechnicalDrawingFile = (fileList: FileList | null) => {
        const file = fileList?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const r = reader.result;
            if (typeof r === 'string') setTechnicalDrawingBase64(r);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
        const payload: ProductTO = {
            id: selectedProductId,
            name,
            description,
            reference: reference.trim(),
            machineIds: selectedMachineIds.length > 0 ? selectedMachineIds : undefined,
            measuringFeaturePrototypes,
            qualityInfoSteps,
        };
        if (technicalDrawingBase64 !== undefined) {
            payload.technicalDrawingBase64 =
                technicalDrawingBase64.length > 0 ? technicalDrawingBase64 : '';
        }
        const onSuccess = () => {
            loadProducts();
            resetForm();
            setFormModalOpen(false);
        };
        if (selectedProductId) {
            Server.editProduct(payload, onSuccess, () => {});
        } else {
            Server.addProduct(payload, onSuccess, () => {});
        }
    };

    const getMachineNames = (machineIds: number[] | undefined) =>
        (machineIds ?? []).map((id) => machines.find((m) => m.id === id)?.machineName ?? id).filter(Boolean).join(', ') || '—';

    const handleDeleteClick = (product: LocalProduct) => {
        setProductToDelete(product);
    };

    const handleConfirmDelete = () => {
        if (!productToDelete?.id) {
            setProductToDelete(null);
            return;
        }
        Server.deleteProduct(
            Number(productToDelete.id),
            () => {
                loadProducts();
                setProductToDelete(null);
            },
            () => setProductToDelete(null),
        );
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        resetForm();
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('productsManagement')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openFormModal}>
                    {t('addProduct')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('name')}</TableCell>
                                <TableCell>{t('catalogueId')}</TableCell>
                                <TableCell>{t('description')}</TableCell>
                                <TableCell>{t('machine')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product.id || product.name}>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell>{product.reference ?? '—'}</TableCell>
                                    <TableCell>{product.description}</TableCell>
                                    <TableCell>{getMachineNames(product.machineIds)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(product)}
                                            sx={{ mr: 1 }}
                                            title={t('editProduct')}
                                        >
                                            <LinkIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteClick(product)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog
                open={formModalOpen}
                onClose={closeFormModal}
                maxWidth="lg"
                fullWidth
                scroll="paper"
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {selectedProductId ? t('editProduct') : t('addProduct')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
                            <TextField
                                label={t('name')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 180 }}
                            />
                            <TextField
                                label={t('catalogueId')}
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                size="small"
                                sx={{ flex: 1, minWidth: 180 }}
                            />
                            <TextField
                                select
                                SelectProps={{
                                    multiple: true,
                                    renderValue: (selected) =>
                                        (selected as number[]).length === 0
                                            ? t('none')
                                            : (selected as number[])
                                                  .map(
                                                      (id) => machines.find((m) => m.id === id)?.machineName ?? id
                                                  )
                                                  .join(', '),
                                }}
                                label={t('machine')}
                                value={selectedMachineIds}
                                onChange={(e) => handleMachineIdsChange(e.target.value)}
                                size="small"
                                sx={{ flex: 1.4, minWidth: 240 }}
                            >
                                {machines.map((m) => (
                                    <MenuItem key={m.id} value={m.id}>
                                        {m.machineName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <TextField
                            label={t('description')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                        />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('technicalDrawing')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1 }}>
                                <Button variant="outlined" component="label" size="small">
                                    {t('technicalDrawingImage')}
                                    <input
                                        key={technicalDrawingInputKey}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            handleTechnicalDrawingFile(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="secondary"
                                    disabled={
                                        technicalDrawingBase64 === undefined
                                            ? !technicalDrawingLoadedSrc
                                            : technicalDrawingBase64.length === 0
                                    }
                                    onClick={() => {
                                        setTechnicalDrawingBase64('');
                                        setTechnicalDrawingLoadedSrc(undefined);
                                        setTechnicalDrawingInputKey((k) => k + 1);
                                    }}
                                >
                                    {t('clearImage')}
                                </Button>
                            </Box>
                            {(technicalDrawingBase64 !== undefined
                                ? technicalDrawingBase64
                                : technicalDrawingLoadedSrc) && (
                                <Box
                                    component="img"
                                    alt=""
                                    src={
                                        (technicalDrawingBase64 !== undefined
                                            ? technicalDrawingBase64
                                            : technicalDrawingLoadedSrc) as string
                                    }
                                    sx={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', borderRadius: 1 }}
                                />
                            )}
                        </Box>

                        <Divider variant="middle" sx={{ my: 2, borderWidth: 2, borderColor: 'text.secondary' }} />
                        <Typography component="h3" variant="h3" sx={{ mt: 0, mb: 1, fontSize: '1.25rem' }}>
                            {t('measuringFeaturePrototypes')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            {/* Row 1: catalogueID, class, frequency */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
                                <TextField
                                    label={t('catalogueId')}
                                    value={protoCatalogueId}
                                    onChange={(e) => setProtoCatalogueId(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1, minWidth: 160 }}
                                />
                                <TextField
                                    select
                                    label={t('class')}
                                    value={protoClassType}
                                    onChange={(e) => setProtoClassType(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="">{t('none')}</MenuItem>
                                    <MenuItem value="CIC">CIC</MenuItem>
                                    <MenuItem value="NORM">NORM</MenuItem>
                                    <MenuItem value="CC">CC</MenuItem>
                                </TextField>
                                <TextField
                                    label={t('frequency')}
                                    value={protoFrequency}
                                    onChange={(e) => setProtoFrequency(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1, minWidth: 160 }}
                                />
                            </Box>

                            {/* Row 2: measuringType, absoluteMeasure checkbox, measuring tool (and toolType) */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    select
                                    label={t('measuringType')}
                                    value={protoCheckType}
                                    onChange={(e) => {
                                        const v = e.target.value as 'ATTRIBUTIVE' | 'MEASURED' | '';
                                        setProtoCheckType(v);
                                        if (v === 'ATTRIBUTIVE') {
                                            setProtoRefValue('');
                                            setProtoMinTolerance('');
                                            setProtoMaxTolerance('');
                                        }
                                    }}
                                    size="small"
                                    sx={{ minWidth: 200 }}
                                >
                                    <MenuItem value="">{t('none')}</MenuItem>
                                    <MenuItem value="ATTRIBUTIVE">{t('attributive')}</MenuItem>
                                    <MenuItem value="MEASURED">{t('measured')}</MenuItem>
                                </TextField>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={protoAbsoluteMeasure}
                                            onChange={(e) => setProtoAbsoluteMeasure(e.target.checked)}
                                        />
                                    }
                                    label={t('absoluteMeasure')}
                                />
                                <TextField
                                    label={t('measuringTool')}
                                    value={protoMeasuringTool}
                                    onChange={(e) => setProtoMeasuringTool(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                />
                                <TextField
                                    label={t('toolType')}
                                    value={protoToolType}
                                    onChange={(e) => setProtoToolType(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                />
                            </Box>

                            {/* Row 3: ref value, min tolerance, max tolerance (not used for ATTRIBUTIVE) */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    label={t('refValue')}
                                    type="number"
                                    value={protoRefValue}
                                    onChange={(e) =>
                                        setProtoRefValue(
                                            e.target.value === '' ? '' : Number(e.target.value)
                                        )
                                    }
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                />
                                <TextField
                                    label={t('toleranceMin')}
                                    type="number"
                                    value={protoMinTolerance}
                                    onChange={(e) =>
                                        setProtoMinTolerance(
                                            e.target.value === '' ? '' : Number(e.target.value)
                                        )
                                    }
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                />
                                <TextField
                                    label={t('toleranceMax')}
                                    type="number"
                                    value={protoMaxTolerance}
                                    onChange={(e) =>
                                        setProtoMaxTolerance(
                                            e.target.value === '' ? '' : Number(e.target.value)
                                        )
                                    }
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                />
                            </Box>

                            {/* Row 4: description */}
                            <TextField
                                label={t('description')}
                                value={protoDescription}
                                onChange={(e) => setProtoDescription(e.target.value)}
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                            />

                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<AddIcon />}
                                    onClick={addMeasuringFeaturePrototype}
                                    disabled={!protoCatalogueId.trim() || !protoDescription.trim()}
                                >
                                    {t('addMeasuringFeaturePrototype')}
                                </Button>
                            </Box>
                        </Box>

                        <Table size="small" sx={{ mt: 1 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('catalogueId')}</TableCell>
                                    <TableCell>{t('description')}</TableCell>
                                    <TableCell>{t('class')}</TableCell>
                                    <TableCell>{t('measuringType')}</TableCell>
                                    <TableCell>{t('absoluteMeasure')}</TableCell>
                                    <TableCell align="right">{t('actions')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {measuringFeaturePrototypes.length > 0 ? (
                                    measuringFeaturePrototypes.map((p, idx) => (
                                        <TableRow key={`${p.id ?? 'new'}-${p.catalogueId ?? idx}-${idx}`}>
                                            <TableCell>{p.catalogueId ?? '—'}</TableCell>
                                            <TableCell>{p.description ?? '—'}</TableCell>
                                            <TableCell>{p.classType ?? '—'}</TableCell>
                                            <TableCell>
                                                {p.checkType === 'ATTRIBUTIVE'
                                                    ? t('attributive')
                                                    : p.checkType === 'MEASURED'
                                                      ? t('measured')
                                                      : p.checkType ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {p.absoluteMeasure == null
                                                    ? '—'
                                                    : p.absoluteMeasure
                                                      ? t('absolute')
                                                      : t('relative')}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeMeasuringFeaturePrototype(idx)}
                                                    title={t('remove')}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('none')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Divider variant="middle" sx={{ my: 2, borderWidth: 2, borderColor: 'text.secondary' }} />
                        <Typography component="h3" variant="h3" sx={{ mt: 0, mb: 1, fontSize: '1.25rem' }}>
                            {t('qualityInfoSteps')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button variant="outlined" component="label" size="small">
                                    {t('qualityStepImage')}
                                    <input
                                        key={qiImageInputKey}
                                        hidden
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            handleQiImageFile(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                {(Boolean(qiImageBase64 && qiImageBase64.length > 0) ||
                                    (editingQualityStepIndex !== null &&
                                        Boolean(qualityInfoSteps[editingQualityStepIndex]?.imageDataBase64))) && (
                                    <Button size="small" onClick={() => setQiImageBase64('')}>
                                        {t('clearImage')}
                                    </Button>
                                )}
                            </Box>
                            {(qiImageBase64 && qiImageBase64.length > 0) ||
                            (editingQualityStepIndex !== null &&
                                qiImageBase64 === undefined &&
                                qualityInfoSteps[editingQualityStepIndex]?.imageDataBase64) ? (
                                <Box
                                    component="img"
                                    alt=""
                                    src={
                                        qiImageBase64 && qiImageBase64.length > 0
                                            ? qiImageBase64
                                            : qualityInfoSteps[editingQualityStepIndex!]?.imageDataBase64?.startsWith(
                                                    'data:',
                                                )
                                              ? qualityInfoSteps[editingQualityStepIndex!]!.imageDataBase64!
                                              : `data:image/png;base64,${qualityInfoSteps[editingQualityStepIndex!]!.imageDataBase64}`
                                    }
                                    sx={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }}
                                />
                            ) : null}
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

                        <Table size="small" sx={{ mt: 1 }}>
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
                                                        title={t('moveUp')}
                                                        aria-label={t('moveUp')}
                                                    >
                                                        <KeyboardArrowUpIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => moveQualityInfoStep(idx, 'down')}
                                                        disabled={idx === qualityInfoSteps.length - 1}
                                                        title={t('moveDown')}
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
                                                    <Box
                                                        component="img"
                                                        alt=""
                                                        src={
                                                            s.imageDataBase64.startsWith('data:')
                                                                ? s.imageDataBase64
                                                                : `data:image/png;base64,${s.imageDataBase64}`
                                                        }
                                                        sx={{ maxHeight: 48, maxWidth: 80, objectFit: 'contain' }}
                                                    />
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => beginEditQualityInfoStep(idx)}
                                                    title={t('edit')}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeQualityInfoStep(idx)}
                                                    title={t('remove')}
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

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleSubmit}>
                                {selectedProductId ? t('editProduct') : t('addProduct')}
                            </Button>
                            <Button variant="outlined" onClick={closeFormModal}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!productToDelete}
                modalMessage={t('confirmDeleteProduct')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setProductToDelete(null)}
            />
        </Box>
    );
}
