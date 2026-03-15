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
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WorkOrderTO, PurchaseOrderTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';

export function WorkOrdersManagementPanel() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [workOrders, setWorkOrders] = useState<WorkOrderTO[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderTO[]>([]);
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
    const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>(undefined);
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [comment, setComment] = useState('');
    const [orderToDelete, setOrderToDelete] = useState<WorkOrderTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    useEffect(() => {
        loadWorkOrders();
        loadPurchaseOrders();
    }, []);

    useEffect(() => {
        const presetId = searchParams.get('createFromPurchaseOrder');
        if (presetId != null && presetId !== '' && !Number.isNaN(Number(presetId))) {
            const id = Number(presetId);
            setSelectedId(undefined);
            setPurchaseOrderId(id);
            setDueDate('');
            setStartDate('');
            setEndDate('');
            setComment('');
            setFormModalOpen(true);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const loadPurchaseOrders = () => {
        Server.getAllPurchaseOrders(
            (response: any) => {
                let data: PurchaseOrderTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setPurchaseOrders(data);
            },
            () => {},
        );
    };

    const loadWorkOrders = () => {
        Server.getAllWorkOrders(
            (response: any) => {
                let data: WorkOrderTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setWorkOrders(data);
            },
            () => {},
        );
    };

    const resetForm = () => {
        setSelectedId(undefined);
        setPurchaseOrderId(undefined);
        setDueDate('');
        setStartDate('');
        setEndDate('');
        setComment('');
    };

    const openFormModal = () => {
        resetForm();
        setFormModalOpen(true);
    };

    const handleEditClick = (wo: WorkOrderTO) => {
        setSelectedId(wo.id);
        setPurchaseOrderId(wo.purchaseOrderId);
        setDueDate(wo.dueDate ? wo.dueDate.substring(0, 10) : '');
        setStartDate(wo.startDate ? wo.startDate.substring(0, 10) : '');
        setEndDate(wo.endDate ? wo.endDate.substring(0, 10) : '');
        setComment(wo.comment || '');
        setFormModalOpen(true);
    };

    const handleSubmit = () => {
        const payload: WorkOrderTO = {
            id: selectedId,
            purchaseOrderId: purchaseOrderId || undefined,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            comment: comment || undefined,
        };

        const onSuccess = () => {
            loadWorkOrders();
            resetForm();
            setFormModalOpen(false);
        };

        if (selectedId) {
            Server.editWorkOrder(payload, onSuccess, () => {});
        } else {
            Server.addWorkOrder(payload, onSuccess, () => {});
        }
    };

    const handleDeleteClick = (wo: WorkOrderTO) => {
        setOrderToDelete(wo);
    };

    const handleConfirmDelete = () => {
        if (orderToDelete?.id == null) {
            setOrderToDelete(null);
            return;
        }
        Server.deleteWorkOrder(
            Number(orderToDelete.id),
            () => {
                loadWorkOrders();
                setOrderToDelete(null);
            },
            () => setOrderToDelete(null),
        );
    };

    const formatDate = (value: string | undefined): string => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        resetForm();
    };

    const purchaseOrderLabel = (po: PurchaseOrderTO) => {
        const ref = po.reference || '';
        const cust = po.customer?.companyName || '';
        return cust ? `${ref} (${cust})` : (ref || `#${po.id}`);
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('workOrdersList')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openFormModal}>
                    {t('createNewWorkOrder')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('purchaseOrder')}</TableCell>
                                <TableCell>{t('dueDate')}</TableCell>
                                <TableCell>{t('startDate')}</TableCell>
                                <TableCell>{t('endDate')}</TableCell>
                                <TableCell>{t('comment')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {workOrders.map((wo) => (
                                <TableRow key={wo.id}>
                                    <TableCell>
                                        {purchaseOrderLabel(purchaseOrders.find((p) => p.id === wo.purchaseOrderId) || { id: wo.purchaseOrderId })}
                                    </TableCell>
                                    <TableCell>{formatDate(wo.dueDate)}</TableCell>
                                    <TableCell>{formatDate(wo.startDate)}</TableCell>
                                    <TableCell>{formatDate(wo.endDate)}</TableCell>
                                    <TableCell>{wo.comment}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(wo)}
                                            sx={{ mr: 1 }}
                                            title={t('editWorkOrder')}
                                        >
                                            <LinkIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteClick(wo)}>
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
                    {selectedId ? t('editWorkOrder') : t('createNewWorkOrder')}
                    <IconButton size="small" onClick={closeFormModal} aria-label={t('close')}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            select
                            label={t('purchaseOrder')}
                            value={purchaseOrderId ?? ''}
                            onChange={(e) => setPurchaseOrderId(e.target.value ? Number(e.target.value) : undefined)}
                            size="small"
                            fullWidth
                            required
                        >
                            <MenuItem value="">{t('none')}</MenuItem>
                            {purchaseOrders.map((po) => (
                                <MenuItem key={po.id} value={po.id}>
                                    {purchaseOrderLabel(po)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={t('dueDate')}
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={t('startDate')}
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={t('endDate')}
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={t('comment')}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleSubmit}>
                                {selectedId ? t('editWorkOrder') : t('addWorkOrder')}
                            </Button>
                            <Button variant="outlined" onClick={closeFormModal}>
                                {t('cancel')}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={!!orderToDelete}
                modalMessage={t('confirmDeleteWorkOrder')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setOrderToDelete(null)}
            />
        </Box>
    );
}
