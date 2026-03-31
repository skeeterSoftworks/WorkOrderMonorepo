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
import ListSubheader from '@mui/material/ListSubheader';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { alpha } from '@mui/material/styles';
import type {
    ProductTO,
    MachineTO,
    CustomerTO,
    MeasuringFeaturePrototypeTO,
    QualityInfoStepTO,
    SetupDataPrototypeTO,
} from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { filterDecimalNumericInput, parseDecimalNumericInputToNumber } from 'sf-common/src/util/DataUtils';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';

type LocalProduct = ProductTO;

function withSequentialStepNumbers(steps: QualityInfoStepTO[]): QualityInfoStepTO[] {
    return steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
}

const DEFAULT_PROTO_CLASS_TYPE = 'CC';
const DEFAULT_PROTO_CHECK_TYPE: 'MEASURED' = 'MEASURED';

export function ProductsManagementPanel() {
    const { t } = useTranslation();

    const [products, setProducts] = useState<LocalProduct[]>([]);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [selectedMachineIds, setSelectedMachineIds] = useState<number[]>([]);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
    const [customerSelectOpen, setCustomerSelectOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<LocalProduct | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const [measuringFeaturePrototypes, setMeasuringFeaturePrototypes] = useState<MeasuringFeaturePrototypeTO[]>(
        []
    );

    // "Add new prototype" form state (added to `measuringFeaturePrototypes` list).
    const [protoCatalogueId, setProtoCatalogueId] = useState('');
    const [protoDescription, setProtoDescription] = useState('');
    const [protoRefValue, setProtoRefValue] = useState('');
    const [protoMinTolerance, setProtoMinTolerance] = useState('');
    const [protoMaxTolerance, setProtoMaxTolerance] = useState('');
    const [protoClassType, setProtoClassType] = useState<string>(DEFAULT_PROTO_CLASS_TYPE);
    const [protoFrequency, setProtoFrequency] = useState('');
    const [protoCheckType, setProtoCheckType] = useState<'ATTRIBUTIVE' | 'MEASURED'>(DEFAULT_PROTO_CHECK_TYPE);
    const [protoMeasuringTool, setProtoMeasuringTool] = useState('');
    const [measuringToolSelectOptions, setMeasuringToolSelectOptions] = useState<string[]>([]);

    const [setupOpId, setSetupOpId] = useState('');
    const [setupToolId, setSetupToolId] = useState('');
    const [setupDRef, setSetupDRef] = useState('');
    const [setupDMaxPos, setSetupDMaxPos] = useState('');
    const [setupDMaxNeg, setSetupDMaxNeg] = useState('');
    const [setupHRef, setSetupHRef] = useState('');
    const [setupHMaxPos, setSetupHMaxPos] = useState('');
    const [setupHMaxNeg, setSetupHMaxNeg] = useState('');
    const [setupAttrHeight, setSetupAttrHeight] = useState(false);
    const [setupAttrDiameter, setSetupAttrDiameter] = useState(false);

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
        loadCustomers();
    }, []);

    useEffect(() => {
        Server.getSelectOptions(
            (resp: { data?: { measuringTools?: string[] } }) => {
                const list = resp?.data?.measuringTools;
                if (Array.isArray(list)) setMeasuringToolSelectOptions(list);
            },
            () => {},
        );
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

    const loadCustomers = () => {
        Server.getAllCustomers(
            (response: any) => {
                let data: CustomerTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setCustomers(data);
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

    const resetSetupInputs = () => {
        setSetupOpId('');
        setSetupToolId('');
        setSetupDRef('');
        setSetupDMaxPos('');
        setSetupDMaxNeg('');
        setSetupHRef('');
        setSetupHMaxPos('');
        setSetupHMaxNeg('');
        setSetupAttrHeight(false);
        setSetupAttrDiameter(false);
    };

    const resetForm = () => {
        setSelectedProductId(undefined);
        setName('');
        setDescription('');
        setReference('');
        setSelectedMachineIds([]);
        setSelectedCustomerIds([]);
        setCustomerSelectOpen(false);

        setMeasuringFeaturePrototypes([]);
        setProtoCatalogueId('');
        setProtoDescription('');
        setProtoRefValue('');
        setProtoMinTolerance('');
        setProtoMaxTolerance('');
        setProtoClassType(DEFAULT_PROTO_CLASS_TYPE);
        setProtoFrequency('');
        setProtoCheckType(DEFAULT_PROTO_CHECK_TYPE);
        setProtoMeasuringTool('');

        resetSetupInputs();

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

    const handleCustomerIdsChange = (value: unknown) => {
        const ids = Array.isArray(value) ? value : [value];
        setSelectedCustomerIds(ids.filter((v): v is number => typeof v === 'number'));
    };

    const resetPrototypeInputs = () => {
        setProtoCatalogueId('');
        setProtoDescription('');
        setProtoRefValue('');
        setProtoMinTolerance('');
        setProtoMaxTolerance('');
        setProtoClassType(DEFAULT_PROTO_CLASS_TYPE);
        setProtoFrequency('');
        setProtoCheckType(DEFAULT_PROTO_CHECK_TYPE);
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

    const isMeasuringFeaturePrototypeFormValid = (): boolean => {
        if (!protoCatalogueId.trim()) return false;
        if (!protoClassType) return false;
        if (!protoFrequency.trim()) return false;
        if (!protoMeasuringTool.trim()) return false;
        if (protoCheckType === 'MEASURED') {
            const ref = protoRefValue.trim();
            const min = protoMinTolerance.trim();
            const max = protoMaxTolerance.trim();
            if (!ref || !min || !max) return false;
            if (
                parseDecimalNumericInputToNumber(ref) === undefined ||
                parseDecimalNumericInputToNumber(min) === undefined ||
                parseDecimalNumericInputToNumber(max) === undefined
            ) {
                return false;
            }
        }
        return true;
    };

    const addMeasuringFeaturePrototype = () => {
        if (!isMeasuringFeaturePrototypeFormValid()) return;

        const catalogueId = protoCatalogueId.trim();
        const desc = protoDescription.trim();
        const isAttributive = protoCheckType === 'ATTRIBUTIVE';
        const toAdd: MeasuringFeaturePrototypeTO = {
            id: undefined,
            catalogueId,
            description: desc || undefined,
            refValue: isAttributive || !protoRefValue.trim()
                ? undefined
                : parseDecimalNumericInputToNumber(protoRefValue),
            minTolerance: isAttributive || !protoMinTolerance.trim()
                ? undefined
                : parseDecimalNumericInputToNumber(protoMinTolerance),
            maxTolerance: isAttributive || !protoMaxTolerance.trim()
                ? undefined
                : parseDecimalNumericInputToNumber(protoMaxTolerance),
            classType: protoClassType,
            frequency: protoFrequency.trim(),
            checkType: protoCheckType,
            measuringTool: protoMeasuringTool.trim(),
        };

        setMeasuringFeaturePrototypes((prev) => [...prev, toAdd]);
        resetPrototypeInputs();
    };

    const removeMeasuringFeaturePrototype = (index: number) => {
        setMeasuringFeaturePrototypes((prev) => prev.filter((_, i) => i !== index));
    };

    const buildSetupDataPrototypePayload = (): SetupDataPrototypeTO | undefined => {
        const op = setupOpId.trim();
        const tool = setupToolId.trim();
        const hasNumeric =
            setupDRef.trim() !== '' ||
            setupDMaxPos.trim() !== '' ||
            setupDMaxNeg.trim() !== '' ||
            setupHRef.trim() !== '' ||
            setupHMaxPos.trim() !== '' ||
            setupHMaxNeg.trim() !== '';
        const hasAttr = setupAttrHeight || setupAttrDiameter;
        if (!op && !tool && !hasNumeric && !hasAttr) {
            return undefined;
        }
        return {
            operationID: op || undefined,
            toolID: tool || undefined,
            attributiveHeightMeasurement: setupAttrHeight,
            attributiveDiameterMeasurement: setupAttrDiameter,
            diameterRefValue: setupAttrDiameter ? undefined : parseDecimalNumericInputToNumber(setupDRef),
            diameterMaxPosTolerance: setupAttrDiameter ? undefined : parseDecimalNumericInputToNumber(setupDMaxPos),
            diameterMaxNegTolerance: setupAttrDiameter ? undefined : parseDecimalNumericInputToNumber(setupDMaxNeg),
            heightRefValue: setupAttrHeight ? undefined : parseDecimalNumericInputToNumber(setupHRef),
            heightMaxPosTolerance: setupAttrHeight ? undefined : parseDecimalNumericInputToNumber(setupHMaxPos),
            heightMaxNegTolerance: setupAttrHeight ? undefined : parseDecimalNumericInputToNumber(setupHMaxNeg),
        };
    };

    const handleEditClick = (product: LocalProduct) => {
        setCustomerSelectOpen(false);
        setSelectedProductId(product.id as number | undefined);
        setName(product.name || '');
        setDescription(product.description || '');
        setReference(product.reference || '');
        setSelectedMachineIds(product.machineIds ?? []);
        setSelectedCustomerIds(product.customerIds ?? []);
        setMeasuringFeaturePrototypes(product.measuringFeaturePrototypes ?? []);
        resetPrototypeInputs();
        const sd = product.setupDataPrototype;
        setSetupOpId(sd?.operationID ?? '');
        setSetupToolId(sd?.toolID ?? '');
        setSetupAttrHeight(Boolean(sd?.attributiveHeightMeasurement));
        setSetupAttrDiameter(Boolean(sd?.attributiveDiameterMeasurement));
        setSetupDRef(sd?.diameterRefValue != null ? String(sd.diameterRefValue) : '');
        setSetupDMaxPos(sd?.diameterMaxPosTolerance != null ? String(sd.diameterMaxPosTolerance) : '');
        setSetupDMaxNeg(sd?.diameterMaxNegTolerance != null ? String(sd.diameterMaxNegTolerance) : '');
        setSetupHRef(sd?.heightRefValue != null ? String(sd.heightRefValue) : '');
        setSetupHMaxPos(sd?.heightMaxPosTolerance != null ? String(sd.heightMaxPosTolerance) : '');
        setSetupHMaxNeg(sd?.heightMaxNegTolerance != null ? String(sd.heightMaxNegTolerance) : '');
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
            customerIds: selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
            setupDataPrototype: buildSetupDataPrototypePayload(),
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
            toastActionSuccess(selectedProductId ? t('toastProductUpdated') : t('toastProductAdded'));
        };
        if (selectedProductId) {
            Server.editProduct(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addProduct(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const getMachineNames = (machineIds: number[] | undefined) =>
        (machineIds ?? []).map((id) => machines.find((m) => m.id === id)?.machineName ?? id).filter(Boolean).join(', ') || '—';

    const getCustomerNames = (customerIds: number[] | undefined) =>
        (customerIds ?? []).map((id) => customers.find((c) => c.id === id)?.companyName ?? id).filter(Boolean).join(', ') || '—';

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
                toastActionSuccess(t('toastProductDeleted'));
            },
            (err: unknown) => {
                setProductToDelete(null);
                toastServerError(err, t);
            },
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
                                <TableCell>{t('customers')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product.id || product.name}>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell>{product.reference ?? '—'}</TableCell>
                                    <TableCell>{product.description}</TableCell>
                                    <TableCell>{getMachineNames(product.machineIds)}</TableCell>
                                    <TableCell>{getCustomerNames(product.customerIds)}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(product)}
                                                sx={tableActionIconButtonSx.edit}
                                                title={t('editProduct')}
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(product)}
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
                            select
                            SelectProps={{
                                multiple: true,
                                open: customerSelectOpen,
                                onOpen: () => setCustomerSelectOpen(true),
                                onClose: () => setCustomerSelectOpen(false),
                                MenuProps: {
                                    PaperProps: {
                                        sx: { maxHeight: 360 },
                                    },
                                    autoFocus: false,
                                },
                                renderValue: (selected) =>
                                    (selected as number[]).length === 0
                                        ? t('none')
                                        : (selected as number[])
                                              .map(
                                                  (id) => customers.find((c) => c.id === id)?.companyName ?? id,
                                              )
                                              .join(', '),
                            }}
                            label={t('customers')}
                            value={selectedCustomerIds}
                            onChange={(e) => handleCustomerIdsChange(e.target.value)}
                            size="small"
                            fullWidth
                        >
                            {customers.map((c) => (
                                <MenuItem
                                    key={c.id}
                                    value={c.id}
                                    sx={(theme) => ({
                                        py: 1,
                                        '&.Mui-selected': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                                            fontWeight: 600,
                                            borderLeft: `3px solid ${theme.palette.primary.main}`,
                                        },
                                        '&.Mui-selected.Mui-focusVisible': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.22),
                                        },
                                        '&.Mui-selected:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.24),
                                        },
                                    })}
                                >
                                    {c.companyName}
                                </MenuItem>
                            ))}
                            <Divider component="li" sx={{ my: 0 }} />
                            <ListSubheader
                                component="div"
                                disableSticky
                                sx={{
                                    lineHeight: 1,
                                    p: 0,
                                    bgcolor: 'background.paper',
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                <Box sx={{ px: 1.25, py: 1 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="small"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setCustomerSelectOpen(false)}
                                    >
                                        {t('done')}
                                    </Button>
                                </Box>
                            </ListSubheader>
                        </TextField>

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
                                    required
                                    label={t('catalogueId')}
                                    value={protoCatalogueId}
                                    onChange={(e) => setProtoCatalogueId(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1, minWidth: 160 }}
                                />
                                <TextField
                                    required
                                    select
                                    label={t('class')}
                                    value={protoClassType}
                                    onChange={(e) => setProtoClassType(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="CIC">CIC</MenuItem>
                                    <MenuItem value="NORM">NORM</MenuItem>
                                    <MenuItem value="CC">CC</MenuItem>
                                </TextField>
                                <TextField
                                    required
                                    label={t('frequency')}
                                    value={protoFrequency}
                                    onChange={(e) => setProtoFrequency(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1, minWidth: 160 }}
                                />
                            </Box>

                            {/* Row 2: measuringType, measuring tool */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    required
                                    select
                                    label={t('measuringType')}
                                    value={protoCheckType}
                                    onChange={(e) => {
                                        const v = e.target.value as 'ATTRIBUTIVE' | 'MEASURED';
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
                                    <MenuItem value="ATTRIBUTIVE">{t('attributive')}</MenuItem>
                                    <MenuItem value="MEASURED">{t('measured')}</MenuItem>
                                </TextField>
                                <TextField
                                    required
                                    select
                                    label={t('measuringTool')}
                                    value={protoMeasuringTool}
                                    onChange={(e) => setProtoMeasuringTool(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                >
                                    <MenuItem value="">{t('selectMeasuringTool')}</MenuItem>
                                    {(() => {
                                        const v = protoMeasuringTool;
                                        const opts = [...measuringToolSelectOptions];
                                        if (v && !opts.includes(v)) opts.push(v);
                                        return opts.map((o) => (
                                            <MenuItem key={o} value={o}>
                                                {o}
                                            </MenuItem>
                                        ));
                                    })()}
                                </TextField>
                            </Box>

                            {/* Row 3: ref value, min tolerance, max tolerance (not used for ATTRIBUTIVE) */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    required={protoCheckType === 'MEASURED'}
                                    label={t('refValue')}
                                    value={protoRefValue}
                                    onChange={(e) => setProtoRefValue(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    required={protoCheckType === 'MEASURED'}
                                    label={t('toleranceMin')}
                                    value={protoMinTolerance}
                                    onChange={(e) => setProtoMinTolerance(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    required={protoCheckType === 'MEASURED'}
                                    label={t('toleranceMax')}
                                    value={protoMaxTolerance}
                                    onChange={(e) => setProtoMaxTolerance(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 180 }}
                                    disabled={protoCheckType === 'ATTRIBUTIVE'}
                                    inputProps={{ inputMode: 'decimal' }}
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
                                    disabled={!isMeasuringFeaturePrototypeFormValid()}
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
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        {t('actions')}
                                    </TableCell>
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
                                            <TableCell align="right" sx={tableActionsTableCellSx}>
                                                <TableActionsRow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeMeasuringFeaturePrototype(idx)}
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
                                                {t('none')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Divider variant="middle" sx={{ my: 2, borderWidth: 2, borderColor: 'text.secondary' }} />
                        <Typography component="h3" variant="h3" sx={{ mt: 0, mb: 1, fontSize: '1.25rem' }}>
                            {t('setupData')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    label={t('operation')}
                                    value={setupOpId}
                                    onChange={(e) => setSetupOpId(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 140, flex: 1 }}
                                />
                                <TextField
                                    label={t('toolId')}
                                    value={setupToolId}
                                    onChange={(e) => setSetupToolId(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 140, flex: 1 }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={setupAttrDiameter}
                                            onChange={(e) => {
                                                const c = e.target.checked;
                                                setSetupAttrDiameter(c);
                                                if (c) {
                                                    setSetupDRef('');
                                                    setSetupDMaxPos('');
                                                    setSetupDMaxNeg('');
                                                }
                                            }}
                                        />
                                    }
                                    label={t('attributiveDiameterMeasurement')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={setupAttrHeight}
                                            onChange={(e) => {
                                                const c = e.target.checked;
                                                setSetupAttrHeight(c);
                                                if (c) {
                                                    setSetupHRef('');
                                                    setSetupHMaxPos('');
                                                    setSetupHMaxNeg('');
                                                }
                                            }}
                                        />
                                    }
                                    label={t('attributiveHeightMeasurement')}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {t('diameterMeasurement')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    label={t('refDiameter')}
                                    value={setupDRef}
                                    onChange={(e) => setSetupDRef(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrDiameter}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    label={t('diameterMaxNegTolerance')}
                                    value={setupDMaxNeg}
                                    onChange={(e) => setSetupDMaxNeg(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrDiameter}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    label={t('diameterMaxPosTolerance')}
                                    value={setupDMaxPos}
                                    onChange={(e) => setSetupDMaxPos(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrDiameter}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {t('heightMeasurement')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    label={t('refHeight')}
                                    value={setupHRef}
                                    onChange={(e) => setSetupHRef(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrHeight}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    label={t('heightMaxNegTolerance')}
                                    value={setupHMaxNeg}
                                    onChange={(e) => setSetupHMaxNeg(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrHeight}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                                <TextField
                                    label={t('heightMaxPosTolerance')}
                                    value={setupHMaxPos}
                                    onChange={(e) => setSetupHMaxPos(filterDecimalNumericInput(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 160 }}
                                    disabled={setupAttrHeight}
                                    inputProps={{ inputMode: 'decimal' }}
                                />
                            </Box>
                        </Box>

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
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        {t('actions')}
                                    </TableCell>
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
                                            <TableCell align="right" sx={tableActionsTableCellSx}>
                                                <TableActionsRow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => beginEditQualityInfoStep(idx)}
                                                        sx={tableActionIconButtonSx.edit}
                                                        title={t('edit')}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeQualityInfoStep(idx)}
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
