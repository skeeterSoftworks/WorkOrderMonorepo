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
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { isInternalStockOrdererCustomer } from '../../util/internalStockOrderer';
import { CustomerFormDialog } from './CustomerFormDialog';

function parseProductsResponse(response: unknown): ProductTO[] {
    const r = response as { data?: ProductTO[] | { data?: ProductTO[] } };
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

export function CustomersManagementPanel() {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [editingCustomer, setEditingCustomer] = useState<CustomerTO | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<CustomerTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const linkedCustomerIds = useMemo(() => {
        const s = new Set<number>();
        for (const p of products) {
            for (const id of p.customerIds ?? []) {
                if (typeof id === 'number' && Number.isFinite(id)) s.add(id);
            }
        }
        return s;
    }, [products]);

    const customersForManagementTable = useMemo(
        () => customers.filter((c) => !isInternalStockOrdererCustomer(c)),
        [customers],
    );

    useEffect(() => {
        loadCustomers();
        loadProducts();
    }, []);

    const loadCustomers = () => {
        Server.getAllCustomers(
            (response: unknown) => {
                const r = response as { data?: CustomerTO[] | { data?: CustomerTO[] } };
                let data: CustomerTO[] = [];
                if (Array.isArray(r?.data)) data = r.data;
                else if (Array.isArray(r?.data?.data)) data = r.data.data;
                setCustomers(data);
            },
            () => {},
        );
    };

    const loadProducts = () => {
        Server.getAllProducts(
            (response: unknown) => setProducts(parseProductsResponse(response)),
            () => {},
        );
    };

    const openFormModal = () => {
        setEditingCustomer(null);
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        setEditingCustomer(null);
    };

    const handleEditClick = (customer: CustomerTO) => {
        setEditingCustomer(customer);
        setFormModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!customerToDelete?.id) {
            setCustomerToDelete(null);
            return;
        }
        Server.deleteCustomer(
            Number(customerToDelete.id),
            () => {
                loadCustomers();
                loadProducts();
                setCustomerToDelete(null);
                toastActionSuccess(t('toastCustomerDeleted'));
            },
            (err: unknown) => {
                setCustomerToDelete(null);
                toastServerError(err, t);
            },
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('customersManagement')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openFormModal}>
                    {t('addCustomer')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('companyName')}</TableCell>
                                <TableCell>{t('addressData')}</TableCell>
                                <TableCell>{t('description')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customersForManagementTable.map((customer) => {
                                const cid = customer.id;
                                const unlinked = cid != null && !linkedCustomerIds.has(cid);
                                return (
                                    <TableRow key={customer.id ?? customer.companyName}>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                                <span>{customer.companyName}</span>
                                                {unlinked && (
                                                    <Tooltip title={t('customerNoProductsLinkedHint')}>
                                                        <Chip size="small" label={t('customerNoProductsBadge')} color="warning" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }} />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{customer.addressData}</TableCell>
                                        <TableCell>{customer.description}</TableCell>
                                        <TableCell align="right" sx={tableActionsTableCellSx}>
                                            <TableActionsRow>
                                                <IconButton size="small" onClick={() => handleEditClick(customer)} sx={tableActionIconButtonSx.edit} title={t('editCustomer')}>
                                                    <LinkIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => setCustomerToDelete(customer)} sx={tableActionIconButtonSx.delete}>
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

            <CustomerFormDialog
                open={formModalOpen}
                customer={editingCustomer}
                onClose={closeFormModal}
                onSaved={() => { loadCustomers(); loadProducts(); }}
            />

            <ConfirmationModal
                open={!!customerToDelete}
                modalMessage={t('confirmDeleteCustomer')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setCustomerToDelete(null)}
            />
        </Box>
    );
}
