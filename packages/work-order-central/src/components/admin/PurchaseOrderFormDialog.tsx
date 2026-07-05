import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { PurchaseOrderTO, ProductOrderTO, CustomerTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastActionError, toastActionSuccess, toastServerError } from '../../util/actionToast';
import { isInternalStockOrdererCustomer } from '../../util/internalStockOrderer';
import { tableActionIconButtonSx } from '../shared/tableActions';

const PURCHASE_ORDER_CURRENCIES = ['RSD', 'EUR'] as const;
type PurchaseOrderCurrency = (typeof PURCHASE_ORDER_CURRENCIES)[number];
type PurchaseOrderCurrencyField = PurchaseOrderCurrency | '';

export type ProductOrderRow = {
    id?: number;
    productId?: number;
    quantity: string;
    pricePerUnit: string;
    catalogueReference: string;
};

export type PurchaseOrderFormImportDraft = {
    customerId?: number;
    comment: string;
    productOrderRows: ProductOrderRow[];
};

function normalizePurchaseOrderCurrency(value: string | undefined | null): PurchaseOrderCurrency {
    const v = (value ?? '').trim().toUpperCase();
    return v === 'EUR' ? 'EUR' : 'RSD';
}

function orderToProductRows(order: PurchaseOrderTO): ProductOrderRow[] {
    const stripPricesInternalPo =
        order.internalStockDemand === true ||
        (order.customer != null && isInternalStockOrdererCustomer(order.customer));
    return (order.productOrderList || []).map((po) => ({
        id: po.id,
        productId: po.product?.id,
        quantity: String(po.quantity ?? ''),
        pricePerUnit: stripPricesInternalPo ? '' : String(po.pricePerUnit ?? ''),
        catalogueReference: po.product?.reference ?? '',
    }));
}

function deliveryDateToInput(deliveryDate: PurchaseOrderTO['deliveryDate']): string {
    if (!deliveryDate) return '';
    if (Array.isArray(deliveryDate)) {
        const [year, month = 1, day = 1] = deliveryDate as number[];
        const d = new Date(year, month - 1, day);
        return d.toISOString().substring(0, 10);
    }
    if (typeof deliveryDate === 'string') {
        return deliveryDate.substring(0, 10);
    }
    return '';
}

type Props = {
    open: boolean;
    editingOrder: PurchaseOrderTO | null;
    importDraft: PurchaseOrderFormImportDraft | null;
    customers: CustomerTO[];
    products: ProductTO[];
    deliveryTermsSelectOptions: string[];
    onClose: () => void;
    onSaved: () => void;
};

export function PurchaseOrderFormDialog({
    open,
    editingOrder,
    importDraft,
    customers,
    products,
    deliveryTermsSelectOptions,
    onClose,
    onSaved,
}: Props) {
    const { t } = useTranslation();
    const editingId = editingOrder?.id;

    const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
    const [currency, setCurrency] = useState<PurchaseOrderCurrencyField>('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTerms, setDeliveryTerms] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [comment, setComment] = useState('');
    const [productOrderRows, setProductOrderRows] = useState<ProductOrderRow[]>([]);

    const internalStockOrdererCustomerId = useMemo(() => {
        const c = customers.find((x) => isInternalStockOrdererCustomer(x));
        return c?.id;
    }, [customers]);

    const ordererCustomersSorted = useMemo(() => {
        const list = [...customers];
        const internalId = internalStockOrdererCustomerId;
        list.sort((a, b) => {
            if (internalId != null) {
                if (a.id === internalId) return -1;
                if (b.id === internalId) return 1;
            }
            return (a.companyName ?? '').localeCompare(b.companyName ?? '', undefined, { sensitivity: 'base' });
        });
        return list;
    }, [customers, internalStockOrdererCustomerId]);

    const productsForSelectedCustomer = useMemo(() => {
        if (selectedCustomerId == null) return [];
        return products.filter((p) => (p.customerIds ?? []).includes(selectedCustomerId));
    }, [products, selectedCustomerId]);

    const noProductsLinkedForCustomer =
        selectedCustomerId != null && productsForSelectedCustomer.length === 0;
    const hasAtLeastOneProductOrder = productOrderRows.some(
        (row) => row.productId != null && Number(row.productId) > 0,
    );
    const isEditingPurchaseOrder = editingId != null && editingId > 0;
    const internalStockOrdererSelected = useMemo(
        () =>
            internalStockOrdererCustomerId != null &&
            selectedCustomerId === internalStockOrdererCustomerId,
        [internalStockOrdererCustomerId, selectedCustomerId],
    );
    const lockCreateDeliveryFields = !isEditingPurchaseOrder && internalStockOrdererSelected;

    useEffect(() => {
        if (!open) return;
        if (editingOrder?.id != null) {
            setSelectedCustomerId(editingOrder.customer?.id);
            setCurrency(normalizePurchaseOrderCurrency(editingOrder.currency));
            setDeliveryDate(deliveryDateToInput(editingOrder.deliveryDate));
            setDeliveryTerms(editingOrder.deliveryTerms || '');
            setShippingAddress(editingOrder.shippingAddress || '');
            setComment(editingOrder.comment || '');
            setProductOrderRows(orderToProductRows(editingOrder));
            return;
        }
        if (importDraft) {
            setSelectedCustomerId(importDraft.customerId);
            setCurrency('');
            setDeliveryDate('');
            setDeliveryTerms('');
            setShippingAddress('');
            setComment(importDraft.comment);
            setProductOrderRows(importDraft.productOrderRows);
            return;
        }
        setSelectedCustomerId(internalStockOrdererCustomerId);
        setCurrency('');
        setDeliveryDate('');
        setDeliveryTerms('');
        setShippingAddress('');
        setComment('');
        setProductOrderRows([]);
    }, [open, editingOrder?.id, importDraft, internalStockOrdererCustomerId]);

    const addProductOrderRow = () => {
        if (noProductsLinkedForCustomer) return;
        setProductOrderRows((prev) => [...prev, { quantity: '', pricePerUnit: '', catalogueReference: '' }]);
    };

    const removeProductOrderRow = (index: number) => {
        setProductOrderRows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateProductOrderRow = (index: number, field: keyof ProductOrderRow, value: number | string) => {
        setProductOrderRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
        );
    };

    const setProductOrderRowProduct = (index: number, productId: number | undefined) => {
        setProductOrderRows((prev) =>
            prev.map((row, i) => {
                if (i !== index) return row;
                const p = productId != null ? products.find((pr) => pr.id === productId) : undefined;
                return {
                    ...row,
                    productId,
                    catalogueReference: p?.reference ?? '',
                };
            }),
        );
    };

    const handleCustomerChange = (customerId: number | undefined) => {
        setSelectedCustomerId(customerId);
        const nowInternal =
            internalStockOrdererCustomerId != null && customerId === internalStockOrdererCustomerId;
        if (!isEditingPurchaseOrder) {
            if (nowInternal) {
                setCurrency('');
                setDeliveryDate('');
                setDeliveryTerms('');
                setShippingAddress('');
            } else if (customerId != null) {
                setCurrency((prev) => (prev === '' ? 'RSD' : prev));
            }
        }
        setProductOrderRows((rows) => {
            if (customerId == null) {
                return rows.map((r) => ({
                    ...r,
                    productId: undefined,
                    catalogueReference: '',
                    pricePerUnit: '',
                }));
            }
            return rows.map((row) => {
                let next = row;
                if (row.productId != null) {
                    const p = products.find((pr) => pr.id === row.productId);
                    const ok = p && (p.customerIds ?? []).includes(customerId);
                    if (!ok) {
                        next = { ...row, productId: undefined, catalogueReference: '' };
                    }
                }
                if (nowInternal) {
                    next = { ...next, pricePerUnit: '' };
                }
                return next;
            });
        });
    };

    const handleSubmit = () => {
        if (!hasAtLeastOneProductOrder) {
            toastActionError(t('purchaseOrderAtLeastOneProductOrderRequired'));
            return;
        }
        const productOrderList: ProductOrderTO[] = productOrderRows
            .filter((row) => row.productId != null && row.productId > 0)
            .map((row) => ({
                id: row.id,
                product: { id: row.productId },
                quantity: Number(row.quantity) || 0,
                pricePerUnit: internalStockOrdererSelected ? 0 : Number(row.pricePerUnit) || 0,
            }));
        const customerId = selectedCustomerId && Number(selectedCustomerId);
        const internalStockDemand = internalStockOrdererSelected;
        const omitDeliveryFieldsForPayload = isEditingPurchaseOrder ? false : internalStockOrdererSelected;
        const payload: PurchaseOrderTO = {
            id: editingId,
            currency: omitDeliveryFieldsForPayload ? undefined : currency || undefined,
            deliveryDate: omitDeliveryFieldsForPayload ? undefined : deliveryDate || undefined,
            deliveryTerms: omitDeliveryFieldsForPayload ? undefined : deliveryTerms || undefined,
            shippingAddress: omitDeliveryFieldsForPayload ? undefined : shippingAddress || undefined,
            comment,
            internalStockDemand,
            customerId,
            customer: customerId != null ? { id: customerId } : undefined,
            productOrderList,
        };

        const onSuccess = () => {
            onSaved();
            onClose();
            toastActionSuccess(editingId ? t('toastPurchaseOrderUpdated') : t('toastPurchaseOrderAdded'));
        };

        const savePurchaseOrder = () => {
            if (editingId) {
                Server.editPurchaseOrder(
                    payload,
                    onSuccess,
                    (err: unknown) => {
                        const body = (err as { response?: { data?: unknown } })?.response?.data;
                        if (body === 'PURCHASE_ORDER_HAS_WORK_ORDER') {
                            toastActionError(t('purchaseOrderHasWorkOrderCannotEdit'));
                            return;
                        }
                        toastServerError(err, t);
                    },
                );
            } else {
                Server.addPurchaseOrder(payload, onSuccess, (err: unknown) => toastServerError(err, t));
            }
        };

        const rowsToSync = productOrderRows.filter((row) => {
            if (!row.productId) return false;
            const p = products.find((pr) => pr.id === row.productId);
            const newR = (row.catalogueReference ?? '').trim();
            const oldR = (p?.reference ?? '').trim();
            return newR !== oldR;
        });

        if (rowsToSync.length === 0) {
            savePurchaseOrder();
            return;
        }

        let remaining = rowsToSync.length;
        let errors = 0;
        const onEditDone = () => {
            remaining -= 1;
            if (remaining === 0) {
                if (errors === 0) {
                    savePurchaseOrder();
                } else {
                    toastActionError(t('toastProductSyncFailed'));
                }
            }
        };
        rowsToSync.forEach((row) => {
            const p = products.find((pr) => pr.id === row.productId);
            if (!p?.id) {
                onEditDone();
                return;
            }
            Server.editProduct(
                {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    reference: (row.catalogueReference ?? '').trim(),
                    machineIds: p.machineIds,
                    customerIds: p.customerIds,
                },
                onEditDone,
                () => {
                    errors += 1;
                    onEditDone();
                },
            );
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {editingId ? t('editPurchaseOrder') : t('createNewPurchaseOrder')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box component="form" autoComplete="off" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        select
                        label={t('purchaseOrderOrderer')}
                        value={selectedCustomerId ?? ''}
                        onChange={(e) =>
                            handleCustomerChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="">{t('none')}</MenuItem>
                        {ordererCustomersSorted.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.companyName}
                            </MenuItem>
                        ))}
                    </TextField>
                    {internalStockOrdererCustomerId == null && (
                        <Typography variant="caption" color="warning.main">
                            {t('internalStockOrdererCustomerMissingHint')}
                        </Typography>
                    )}
                    <TextField
                        select
                        label={t('currency')}
                        value={lockCreateDeliveryFields ? '' : currency || 'RSD'}
                        onChange={(e) => setCurrency(e.target.value as PurchaseOrderCurrency)}
                        size="small"
                        fullWidth
                        disabled={lockCreateDeliveryFields}
                        SelectProps={{ displayEmpty: true }}
                    >
                        {lockCreateDeliveryFields && (
                            <MenuItem value="">
                                <em>—</em>
                            </MenuItem>
                        )}
                        {!lockCreateDeliveryFields &&
                            PURCHASE_ORDER_CURRENCIES.map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                    </TextField>
                    <TextField
                        label={t('deliveryDate')}
                        type="date"
                        value={lockCreateDeliveryFields ? '' : deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        size="small"
                        fullWidth
                        disabled={lockCreateDeliveryFields}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ lang: 'en-GB' }}
                    />
                    <Autocomplete
                        disablePortal
                        options={[...new Set(deliveryTermsSelectOptions.map((x) => String(x).trim()).filter(Boolean))]}
                        value={lockCreateDeliveryFields ? '' : deliveryTerms}
                        onChange={(_, value) => setDeliveryTerms(value ?? '')}
                        disabled={lockCreateDeliveryFields}
                        renderInput={(params) => (
                            <TextField {...params} label={t('deliveryTerms')} size="small" fullWidth />
                        )}
                    />
                    <TextField
                        label={t('shippingAddress')}
                        value={lockCreateDeliveryFields ? '' : shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={lockCreateDeliveryFields}
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
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        {t('productOrders')}
                    </Typography>
                    {noProductsLinkedForCustomer ? (
                        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                            {t('purchaseOrderNoProductsForCustomer')}
                        </Typography>
                    ) : null}
                    {productOrderRows.map((row, index) => (
                        <Box
                            key={index}
                            sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'nowrap' }}
                        >
                            <TextField
                                select
                                label={t('product')}
                                value={row.productId ?? ''}
                                onChange={(e) =>
                                    setProductOrderRowProduct(
                                        index,
                                        e.target.value ? Number(e.target.value) : undefined,
                                    )
                                }
                                size="small"
                                sx={{ minWidth: 160, flex: 1 }}
                                disabled={
                                    selectedCustomerId == null ||
                                    (noProductsLinkedForCustomer && row.productId == null)
                                }
                                helperText={
                                    selectedCustomerId == null
                                        ? t('purchaseOrderSelectCustomerForProducts')
                                        : undefined
                                }
                            >
                                <MenuItem value="">{t('none')}</MenuItem>
                                {(() => {
                                    const pid = row.productId;
                                    const list = [...productsForSelectedCustomer];
                                    if (
                                        pid != null &&
                                        !list.some((p) => p.id === pid) &&
                                        products.some((p) => p.id === pid)
                                    ) {
                                        const orphan = products.find((p) => p.id === pid);
                                        if (orphan) list.push(orphan);
                                    }
                                    return list.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ));
                                })()}
                            </TextField>
                            <TextField
                                label={t('catalogueId')}
                                value={row.catalogueReference}
                                onChange={(e) => updateProductOrderRow(index, 'catalogueReference', e.target.value)}
                                size="small"
                                sx={{ minWidth: 140 }}
                            />
                            <TextField
                                type="number"
                                label={t('quantity')}
                                value={row.quantity}
                                onChange={(e) => updateProductOrderRow(index, 'quantity', e.target.value)}
                                size="small"
                                sx={{ width: 100 }}
                            />
                            <TextField
                                type="number"
                                label={t('pricePerUnit')}
                                value={internalStockOrdererSelected ? '' : row.pricePerUnit}
                                onChange={(e) => updateProductOrderRow(index, 'pricePerUnit', e.target.value)}
                                size="small"
                                sx={{ width: 120 }}
                                disabled={internalStockOrdererSelected}
                            />
                            <IconButton
                                size="small"
                                onClick={() => removeProductOrderRow(index)}
                                aria-label={t('remove')}
                                sx={tableActionIconButtonSx.delete}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Button
                        startIcon={<AddIcon />}
                        variant="outlined"
                        size="small"
                        onClick={addProductOrderRow}
                        disabled={noProductsLinkedForCustomer}
                    >
                        {t('addProductOrder')}
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={!hasAtLeastOneProductOrder}
                        >
                            {editingId ? t('editPurchaseOrder') : t('addPurchaseOrder')}
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
