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
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductTO, MachineTO, ToolTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';

type LocalProduct = ProductTO;

export function ProductsManagementPanel() {
    const { t } = useTranslation();

    const [products, setProducts] = useState<LocalProduct[]>([]);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
    const [selectedToolId, setSelectedToolId] = useState<number | undefined>(undefined);
    const [productToDelete, setProductToDelete] = useState<LocalProduct | null>(null);

    const selectedMachine = machines.find((m) => m.id === selectedMachineId);
    const availableTools: ToolTO[] = selectedMachine?.tools ?? [];

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
        setSelectedMachineId(undefined);
        setSelectedToolId(undefined);
    };

    const handleMachineChange = (machineId: number | undefined) => {
        setSelectedMachineId(machineId);
        setSelectedToolId(undefined);
    };

    const handleEditClick = (product: LocalProduct) => {
        setSelectedProductId(product.id as number | undefined);
        setName(product.name || '');
        setDescription(product.description || '');
        setSelectedMachineId(product.machineId);
        setSelectedToolId(product.toolId);
    };

    const handleSubmit = () => {
        const payload: ProductTO = {
            id: selectedProductId,
            name,
            description,
            machineId: selectedMachineId,
            toolId: selectedToolId,
        };
        const onSuccess = () => {
            loadProducts();
            resetForm();
        };
        if (selectedProductId) {
            Server.editProduct(payload, onSuccess, () => {});
        } else {
            Server.addProduct(payload, onSuccess, () => {});
        }
    };

    const getMachineName = (machineId: number | undefined) =>
        machineId == null ? '' : machines.find((m) => m.id === machineId)?.machineName ?? '';
    const getToolName = (toolId: number | undefined) => {
        if (toolId == null) return '';
        for (const m of machines) {
            const tool = (m.tools ?? []).find((t) => t.id === toolId);
            if (tool) return tool.toolName ?? '';
        }
        return '';
    };

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
            () => {
                setProductToDelete(null);
            }
        );
    };

    return (
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 320, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('productsManagement')}
                </Typography>

                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label={t('name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                        label={t('machine')}
                        value={selectedMachineId ?? ''}
                        onChange={(e) => handleMachineChange(e.target.value ? Number(e.target.value) : undefined)}
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="">{t('none')}</MenuItem>
                        {machines.map((m) => (
                            <MenuItem key={m.id} value={m.id}>
                                {m.machineName}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label={t('tool')}
                        value={selectedToolId ?? ''}
                        onChange={(e) => setSelectedToolId(e.target.value ? Number(e.target.value) : undefined)}
                        size="small"
                        fullWidth
                        disabled={!selectedMachineId}
                    >
                        <MenuItem value="">{t('none')}</MenuItem>
                        {availableTools.map((tool) => (
                            <MenuItem key={tool.id} value={tool.id}>
                                {tool.toolName}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {selectedProductId ? t('editProduct') : t('addProduct')}
                        </Button>
                        <Button variant="outlined" onClick={resetForm}>
                            {t('reset')}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ flex: 2, minWidth: 400, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('productsList')}
                </Typography>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('name')}</TableCell>
                                <TableCell>{t('description')}</TableCell>
                                <TableCell>{t('machine')}</TableCell>
                                <TableCell>{t('tool')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product.id || product.name}>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell>{product.description}</TableCell>
                                    <TableCell>{getMachineName(product.machineId)}</TableCell>
                                    <TableCell>{getToolName(product.toolId)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(product)}
                                            sx={{ mr: 1 }}
                                        >
                                            <LinkIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteClick(product)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal
                open={!!productToDelete}
                modalMessage={t('confirmDeleteProduct')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setProductToDelete(null)}
            />
        </Box>
    );
}

