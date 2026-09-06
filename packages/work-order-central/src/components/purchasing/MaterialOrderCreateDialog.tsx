import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
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
import type {
    MaterialOrderLineTO,
    MaterialOrderTO,
    MaterialProviderTO,
    MaterialTO,
    ProductMaterialUnitOfMeasure,
} from 'sf-common/src/models/ApiRequests';
import { PRODUCT_MATERIAL_UNITS_OF_MEASURE } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

const DEFAULT_UNIT: ProductMaterialUnitOfMeasure = 'PCS';

type CreateMode = 'byProvider' | 'byMaterial';

type LineDraft = {
    materialId?: number;
    quantity: string;
    unitOfMeasure: ProductMaterialUnitOfMeasure;
};

function newLineDraft(): LineDraft {
    return { materialId: undefined, quantity: '', unitOfMeasure: DEFAULT_UNIT };
}

function normalizeUnit(value: unknown): ProductMaterialUnitOfMeasure {
    if (typeof value === 'string' && (PRODUCT_MATERIAL_UNITS_OF_MEASURE as readonly string[]).includes(value)) {
        return value as ProductMaterialUnitOfMeasure;
    }
    return DEFAULT_UNIT;
}

function formatMaterialOptionLabel(material: MaterialTO): string {
    const code = material.code?.trim() || '—';
    const name = material.name?.trim() || '—';
    return `${code} (${name})`;
}

function formatProviderOptionLabel(provider: MaterialProviderTO): string {
    return provider.name?.trim() || provider.contactPerson?.trim() || (provider.id != null ? `#${provider.id}` : '—');
}

function providersOfMaterial(material: MaterialTO | undefined): MaterialProviderTO[] {
    if (!material) return [];
    const fromList = (material.providers ?? []).filter((provider): provider is MaterialProviderTO => provider?.id != null);
    if (fromList.length > 0) return fromList;
    if (material.provider?.id != null) return [material.provider];
    return [];
}

function filterMaterialsByQuery(options: MaterialTO[], inputValue: string): MaterialTO[] {
    const q = inputValue.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((material) => {
        const code = (material.code ?? '').toLocaleLowerCase();
        const name = (material.name ?? '').toLocaleLowerCase();
        const id = material.id != null ? String(material.id) : '';
        return code.includes(q) || name.includes(q) || id.includes(q);
    });
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
    const [createMode, setCreateMode] = useState<CreateMode>('byProvider');

    const [materialProviderId, setMaterialProviderId] = useState<number | undefined>(undefined);
    const [createLines, setCreateLines] = useState<LineDraft[]>([newLineDraft()]);

    const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>(undefined);
    const [materialModeProviderId, setMaterialModeProviderId] = useState<number | undefined>(undefined);
    const [materialModeQuantity, setMaterialModeQuantity] = useState('');
    const [materialModeUnit, setMaterialModeUnit] = useState<ProductMaterialUnitOfMeasure>(DEFAULT_UNIT);

    const resetForm = () => {
        setCreateMode('byProvider');
        setMaterialProviderId(undefined);
        setCreateLines([newLineDraft()]);
        setSelectedMaterialId(undefined);
        setMaterialModeProviderId(undefined);
        setMaterialModeQuantity('');
        setMaterialModeUnit(DEFAULT_UNIT);
    };

    useEffect(() => {
        if (!open) return;
        resetForm();
    }, [open]);

    const materialsSorted = useMemo(
        () =>
            [...materials]
                .filter((material) => material.id != null)
                .sort((a, b) => formatMaterialOptionLabel(a).localeCompare(formatMaterialOptionLabel(b))),
        [materials],
    );

    const materialsForProvider = useMemo(
        () =>
            materialProviderId == null
                ? []
                : materialsSorted.filter((material) =>
                      providersOfMaterial(material).some((provider) => provider.id === materialProviderId),
                  ),
        [materialsSorted, materialProviderId],
    );

    const selectedMaterial = useMemo(
        () => materialsSorted.find((material) => material.id === selectedMaterialId),
        [materialsSorted, selectedMaterialId],
    );

    const providersForSelectedMaterial = useMemo(
        () => providersOfMaterial(selectedMaterial),
        [selectedMaterial],
    );

    const canCreateByProvider =
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

    const canCreateByMaterial =
        selectedMaterialId != null &&
        materialModeProviderId != null &&
        Number(materialModeQuantity) > 0 &&
        Number.isFinite(Number(materialModeQuantity));

    const canCreate = createMode === 'byProvider' ? canCreateByProvider : canCreateByMaterial;

    const updateCreateLine = (index: number, patch: Partial<LineDraft>) => {
        setCreateLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    };

    const submitOrder = (materialProviderIdValue: number, linePayload: MaterialOrderLineTO[]) => {
        Server.addMaterialOrder(
            { materialProviderId: materialProviderIdValue, lines: linePayload },
            (response: { data?: MaterialOrderTO }) => {
                const saved = response?.data;
                onClose();
                toastActionSuccess(t('toastMaterialOrderAdded'));
                if (saved) onCreated(saved);
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const handleCreate = () => {
        if (!canCreate) return;
        if (createMode === 'byProvider') {
            if (materialProviderId == null) return;
            submitOrder(
                materialProviderId,
                createLines.map((line) => ({
                    materialId: line.materialId,
                    quantity: Math.trunc(Number(line.quantity)),
                    materialUnitOfMeasure: line.unitOfMeasure,
                })),
            );
            return;
        }
        if (materialModeProviderId == null || selectedMaterialId == null) return;
        submitOrder(materialModeProviderId, [
            {
                materialId: selectedMaterialId,
                quantity: Math.trunc(Number(materialModeQuantity)),
                materialUnitOfMeasure: materialModeUnit,
            },
        ]);
    };

    const handleModeChange = (nextMode: CreateMode) => {
        setCreateMode(nextMode);
        setMaterialProviderId(undefined);
        setCreateLines([newLineDraft()]);
        setSelectedMaterialId(undefined);
        setMaterialModeProviderId(undefined);
        setMaterialModeQuantity('');
        setMaterialModeUnit(DEFAULT_UNIT);
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
                    <FormControl component="fieldset">
                        <FormLabel component="legend">{t('materialOrderCreateMode')}</FormLabel>
                        <RadioGroup
                            row
                            value={createMode}
                            onChange={(e) => handleModeChange(e.target.value as CreateMode)}
                        >
                            <FormControlLabel
                                value="byProvider"
                                control={<Radio size="small" />}
                                label={t('materialOrderCreateByProvider')}
                            />
                            <FormControlLabel
                                value="byMaterial"
                                control={<Radio size="small" />}
                                label={t('materialOrderCreateByMaterial')}
                            />
                        </RadioGroup>
                    </FormControl>

                    {createMode === 'byProvider' ? (
                        <>
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
                                        {formatProviderOptionLabel(provider)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Typography variant="subtitle2">{t('materialOrderLinesTitle')}</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('materialName')}</TableCell>
                                            <TableCell width={120}>{t('productMaterialUnitOfMeasure')}</TableCell>
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
                                                        onChange={(e) =>
                                                            updateCreateLine(index, {
                                                                materialId: e.target.value
                                                                    ? Number(e.target.value)
                                                                    : undefined,
                                                            })
                                                        }
                                                        size="small"
                                                        fullWidth
                                                        disabled={materialProviderId == null}
                                                    >
                                                        <MenuItem value="">{t('none')}</MenuItem>
                                                        {materialsForProvider.map((material) => (
                                                            <MenuItem key={material.id} value={material.id}>
                                                                {formatMaterialOptionLabel(material)}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        value={line.unitOfMeasure}
                                                        onChange={(e) =>
                                                            updateCreateLine(index, {
                                                                unitOfMeasure: normalizeUnit(e.target.value),
                                                            })
                                                        }
                                                        size="small"
                                                        fullWidth
                                                        disabled={materialProviderId == null}
                                                    >
                                                        {PRODUCT_MATERIAL_UNITS_OF_MEASURE.map((unit) => (
                                                            <MenuItem key={unit} value={unit}>
                                                                {t(`unitOfMeasure_${unit}`)}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        type="number"
                                                        value={line.quantity}
                                                        onChange={(e) =>
                                                            updateCreateLine(index, { quantity: e.target.value })
                                                        }
                                                        size="small"
                                                        fullWidth
                                                        inputProps={{ min: 1, step: 1 }}
                                                        disabled={materialProviderId == null}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            setCreateLines((prev) =>
                                                                prev.length <= 1
                                                                    ? prev
                                                                    : prev.filter((_, i) => i !== index),
                                                            )
                                                        }
                                                        disabled={createLines.length <= 1}
                                                        aria-label={t('removeMaterialOrderLine')}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateLines((prev) => [...prev, newLineDraft()])}
                                disabled={materialProviderId == null}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {t('addMaterialOrderLine')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Autocomplete
                                options={materialsSorted}
                                value={selectedMaterial ?? null}
                                onChange={(_, value) => {
                                    setSelectedMaterialId(value?.id);
                                    const related = providersOfMaterial(value ?? undefined);
                                    setMaterialModeProviderId(
                                        related.length === 1 ? related[0]?.id : undefined,
                                    );
                                }}
                                getOptionLabel={formatMaterialOptionLabel}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                filterOptions={(options, state) => filterMaterialsByQuery(options, state.inputValue)}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.id}>
                                        {formatMaterialOptionLabel(option)}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={t('materialName')}
                                        size="small"
                                        fullWidth
                                        required
                                        helperText={t('materialOrderCreateMaterialFilterHint')}
                                    />
                                )}
                            />
                            <TextField
                                select
                                label={t('materialProviderName')}
                                value={materialModeProviderId ?? ''}
                                onChange={(e) =>
                                    setMaterialModeProviderId(e.target.value ? Number(e.target.value) : undefined)
                                }
                                size="small"
                                fullWidth
                                required
                                disabled={selectedMaterialId == null}
                                helperText={
                                    selectedMaterialId == null
                                        ? t('selectMaterialFirst')
                                        : providersForSelectedMaterial.length === 0
                                          ? t('materialOrderCreateNoProvidersForMaterial')
                                          : undefined
                                }
                            >
                                <MenuItem value="">{t('none')}</MenuItem>
                                {providersForSelectedMaterial.map((provider) => (
                                    <MenuItem key={provider.id} value={provider.id}>
                                        {formatProviderOptionLabel(provider)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                <TextField
                                    select
                                    label={t('productMaterialUnitOfMeasure')}
                                    value={materialModeUnit}
                                    onChange={(e) => setMaterialModeUnit(normalizeUnit(e.target.value))}
                                    size="small"
                                    sx={{ minWidth: 140 }}
                                    disabled={selectedMaterialId == null}
                                >
                                    {PRODUCT_MATERIAL_UNITS_OF_MEASURE.map((unit) => (
                                        <MenuItem key={unit} value={unit}>
                                            {t(`unitOfMeasure_${unit}`)}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    type="number"
                                    label={t('quantity')}
                                    value={materialModeQuantity}
                                    onChange={(e) => setMaterialModeQuantity(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 140 }}
                                    inputProps={{ min: 1, step: 1 }}
                                    required
                                    disabled={selectedMaterialId == null}
                                />
                            </Box>
                        </>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" onClick={handleCreate} disabled={!canCreate}>
                            {t('saveAction')}
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
