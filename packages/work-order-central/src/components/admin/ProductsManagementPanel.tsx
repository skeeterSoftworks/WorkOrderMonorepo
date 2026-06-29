import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import type { ProductTO, MachineTO, CustomerTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { isInternalStockOrdererCustomer } from '../../util/internalStockOrderer';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductTechnologyDialog } from './ProductTechnologyDialog';
import { ProductMaterialsDialog } from './ProductMaterialsDialog';

type LocalProduct = ProductTO;

export function ProductsManagementPanel() {
    const { t } = useTranslation();

    const [products, setProducts] = useState<LocalProduct[]>([]);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [productToDelete, setProductToDelete] = useState<LocalProduct | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);

    const [technologyModalOpen, setTechnologyModalOpen] = useState(false);
    const [technologyModalProduct, setTechnologyModalProduct] = useState<LocalProduct | null>(null);
    const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
    const [materialsModalProduct, setMaterialsModalProduct] = useState<LocalProduct | null>(null);

    useEffect(() => {
        loadProducts();
        loadMachines();
        loadCustomers();
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

    const openFormModal = () => {
        setEditingProduct(null);
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        setEditingProduct(null);
    };

    const handleEditClick = (product: LocalProduct) => {
        setEditingProduct(product);
        setFormModalOpen(true);
    };

    const getMachineNames = (machineIds: number[] | undefined) =>
        (machineIds ?? []).map((id) => machines.find((m) => m.id === id)?.machineName ?? id).filter(Boolean).join(', ') || '—';

    const getCustomerNames = (customerIds: number[] | undefined) =>
        (customerIds ?? [])
            .map((id) => customers.find((c) => c.id === id))
            .filter((c): c is CustomerTO => Boolean(c) && !isInternalStockOrdererCustomer(c))
            .map((c) => c.companyName)
            .filter(Boolean)
            .join(', ') || '—';

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

    const openMaterialsModal = (product: LocalProduct) => {
        if (!product.id) return;
        const latest = products.find((p) => p.id === product.id) ?? product;
        setMaterialsModalProduct(latest);
        setMaterialsModalOpen(true);
    };

    const closeMaterialsModal = () => {
        setMaterialsModalOpen(false);
        setMaterialsModalProduct(null);
    };

    const openTechnologyModal = (product: LocalProduct) => {
        if (!product.id) return;
        const latest = products.find((p) => p.id === product.id) ?? product;
        setTechnologyModalProduct(latest);
        setTechnologyModalOpen(true);
    };

    const closeTechnologyModal = () => {
        setTechnologyModalOpen(false);
        setTechnologyModalProduct(null);
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
                                <TableCell sx={{ minWidth: 173, width: '26%' }}>{t('name')}</TableCell>
                                <TableCell>{t('catalogueId')}</TableCell>
                                <TableCell>{t('machine')}</TableCell>
                                <TableCell>{t('customers')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => {
                                const noMeasuringFeatures =
                                    (product.measuringFeaturePrototypes?.length ?? 0) === 0;
                                const noQualitySteps = (product.qualityInfoSteps?.length ?? 0) === 0;
                                const noMaterials = (product.productMaterials?.length ?? 0) === 0;
                                const chipSx = {
                                    height: 22,
                                    '& .MuiChip-label': { px: 1, fontSize: '0.7rem' },
                                } as const;
                                return (
                                <TableRow key={product.id || product.name}>
                                    <TableCell sx={{ maxWidth: 288, verticalAlign: 'top' }}>
                                        <Stack direction="column" alignItems="flex-start" spacing={0.75}>
                                            <Typography variant="body2" component="span">
                                                {product.name}
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                {noMeasuringFeatures && (
                                                    <Tooltip title={t('productNoMeasuringFeaturesHint')}>
                                                        <Chip
                                                            size="small"
                                                            label={t('productNoMeasuringFeaturesBadge')}
                                                            color="warning"
                                                            variant="outlined"
                                                            sx={chipSx}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {noQualitySteps && (
                                                    <Tooltip title={t('productNoQualityStepsHint')}>
                                                        <Chip
                                                            size="small"
                                                            label={t('productNoQualityStepsBadge')}
                                                            color="warning"
                                                            variant="outlined"
                                                            sx={chipSx}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {noMaterials && (
                                                    <Tooltip title={t('productNoMaterialsHint')}>
                                                        <Chip
                                                            size="small"
                                                            label={t('productNoMaterialsBadge')}
                                                            color="warning"
                                                            variant="outlined"
                                                            sx={chipSx}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{product.reference ?? '—'}</TableCell>
                                    <TableCell>{getMachineNames(product.machineIds)}</TableCell>
                                    <TableCell>{getCustomerNames(product.customerIds)}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => openTechnologyModal(product)}
                                                disabled={!product.id}
                                                title={t('technologyEditTooltip')}
                                                sx={(theme) => ({
                                                    minWidth: 28,
                                                    color: theme.palette.primary.main,
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                                    },
                                                })}
                                            >
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: 800,
                                                        color: 'primary.main',
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    T
                                                </Typography>
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => openMaterialsModal(product)}
                                                disabled={!product.id}
                                                title={t('materialsEditTooltip')}
                                                sx={(theme) => ({
                                                    minWidth: 28,
                                                    color: theme.palette.secondary.main,
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                                                    },
                                                })}
                                            >
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: 800,
                                                        color: 'secondary.main',
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    M
                                                </Typography>
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(product)}
                                                sx={tableActionIconButtonSx.edit}
                                                title={t('editProduct')}
                                            >
                                                <EditIcon fontSize="small" />
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
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ProductFormDialog
                open={formModalOpen}
                product={editingProduct}
                machines={machines}
                customers={customers}
                onClose={closeFormModal}
                onSaved={loadProducts}
            />

            <ProductTechnologyDialog
                open={technologyModalOpen}
                product={technologyModalProduct}
                onClose={closeTechnologyModal}
                onSaved={loadProducts}
            />

            <ProductMaterialsDialog
                open={materialsModalOpen}
                product={materialsModalProduct}
                onClose={closeMaterialsModal}
                onSaved={loadProducts}
            />

            <ConfirmationModal
                open={!!productToDelete}
                modalMessage={t('confirmDeleteProduct')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setProductToDelete(null)}
            />
        </Box>
    );
}
