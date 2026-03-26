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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import type { ProductTO, MachineTO, MeasuringFeaturePrototypeTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';

type LocalProduct = ProductTO;

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

    const addMeasuringFeaturePrototype = () => {
        const catalogueId = protoCatalogueId.trim();
        const desc = protoDescription.trim();
        if (!catalogueId || !desc) return;

        const toAdd: MeasuringFeaturePrototypeTO = {
            id: undefined,
            catalogueId,
            description: desc,
            absoluteMeasure: protoAbsoluteMeasure,
            refValue: protoRefValue === '' ? undefined : protoRefValue,
            minTolerance: protoMinTolerance === '' ? undefined : protoMinTolerance,
            maxTolerance: protoMaxTolerance === '' ? undefined : protoMaxTolerance,
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
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        const payload: ProductTO = {
            id: selectedProductId,
            name,
            description,
            reference: reference.trim(),
            machineIds: selectedMachineIds.length > 0 ? selectedMachineIds : undefined,
            measuringFeaturePrototypes,
        };
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

                        <Divider variant="middle" sx={{ my: 2, borderWidth: 2, borderColor: 'text.secondary' }} />
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
                                    onChange={(e) => setProtoCheckType(e.target.value as any)}
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

                            {/* Row 3: ref value, min tolerance, max tolerance */}
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

                        <Typography variant="subtitle1" sx={{ mt: 1 }}>
                            {measuringFeaturePrototypes.length > 0 ? t('measuringFeaturePrototypes') : ''}
                        </Typography>

                        <Table size="small">
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
