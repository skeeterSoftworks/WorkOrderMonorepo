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
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

export function CustomersManagementPanel() {
    const { t } = useTranslation();

    const [customers, setCustomers] = useState<CustomerTO[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
    const [companyName, setCompanyName] = useState('');
    const [addressData, setAddressData] = useState('');
    const [description, setDescription] = useState('');
    const [customerToDelete, setCustomerToDelete] = useState<CustomerTO | null>(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = () => {
        Server.getAllCustomers(
            (response: any) => {
                let data: CustomerTO[] = [];
                if (Array.isArray(response?.data)) {
                    data = response.data;
                } else if (Array.isArray(response?.data?.data)) {
                    data = response.data.data;
                }
                setCustomers(data);
            },
            () => {},
        );
    };

    const resetForm = () => {
        setSelectedCustomerId(undefined);
        setCompanyName('');
        setAddressData('');
        setDescription('');
    };

    const handleEditClick = (customer: CustomerTO) => {
        setSelectedCustomerId(customer.id);
        setCompanyName(customer.companyName || '');
        setAddressData(customer.addressData || '');
        setDescription(customer.description || '');
    };

    const handleSubmit = () => {
        const payload: CustomerTO = {
            id: selectedCustomerId,
            companyName: companyName || undefined,
            addressData: addressData || undefined,
            description: description || undefined,
        };
        const onSuccess = () => {
            loadCustomers();
            resetForm();
            toastActionSuccess(selectedCustomerId ? t('toastCustomerUpdated') : t('toastCustomerAdded'));
        };
        if (selectedCustomerId) {
            Server.editCustomer(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addCustomer(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const handleDeleteClick = (customer: CustomerTO) => {
        setCustomerToDelete(customer);
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
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 320, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('customersManagement')}
                </Typography>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label={t('companyName')}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('addressData')}
                        value={addressData}
                        onChange={(e) => setAddressData(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
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
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {selectedCustomerId ? t('editCustomer') : t('addCustomer')}
                        </Button>
                        <Button variant="outlined" onClick={resetForm}>
                            {t('reset')}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ flex: 2, minWidth: 400, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('customersList')}
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('companyName')}</TableCell>
                                <TableCell>{t('addressData')}</TableCell>
                                <TableCell>{t('description')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.id || customer.companyName}>
                                    <TableCell>{customer.companyName}</TableCell>
                                    <TableCell>{customer.addressData}</TableCell>
                                    <TableCell>{customer.description}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(customer)}
                                                sx={tableActionIconButtonSx.edit}
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(customer)}
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

            <ConfirmationModal
                open={!!customerToDelete}
                modalMessage={t('confirmDeleteCustomer')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setCustomerToDelete(null)}
            />
        </Box>
    );
}
