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
import type { ProductTO, MachineTO } from 'sf-common/src/models/ApiRequests';
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
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const handleMachineIdsChange = (value: unknown) => {
        const ids = Array.isArray(value) ? value : [value];
        setSelectedMachineIds(ids.filter((v): v is number => typeof v === 'number'));
    };

    const handleEditClick = (product: LocalProduct) => {
        setSelectedProductId(product.id as number | undefined);
        setName(product.name || '');
        setDescription(product.description || '');
        setReference(product.reference || '');
        setSelectedMachineIds(product.machineIds ?? []);
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        const payload: ProductTO = {
            id: selectedProductId,
            name,
            description,
            reference: reference.trim(),
            machineIds: selectedMachineIds.length > 0 ? selectedMachineIds : undefined,
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

            <Dialog open={formModalOpen} onClose={closeFormModal} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {selectedProductId ? t('editProduct') : t('addProduct')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label={t('name')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('catalogueId')}
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('description')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <TextField
                            select
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) =>
                                    (selected as number[]).length === 0
                                        ? t('none')
                                        : (selected as number[])
                                              .map((id) => machines.find((m) => m.id === id)?.machineName ?? id)
                                              .join(', '),
                            }}
                            label={t('machine')}
                            value={selectedMachineIds}
                            onChange={(e) => handleMachineIdsChange(e.target.value)}
                            size="small"
                            fullWidth
                        >
                            {machines.map((m) => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.machineName}
                                </MenuItem>
                            ))}
                        </TextField>
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
