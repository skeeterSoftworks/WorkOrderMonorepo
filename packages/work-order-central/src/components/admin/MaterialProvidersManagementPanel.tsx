import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MaterialProviderTO, MaterialTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import { useTranslation } from 'react-i18next';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { MaterialProviderFormSection, type MaterialProviderFormValues } from './MaterialProviderFormSection';
import { MaterialsCatalogDialog } from './MaterialsCatalogDialog';

function providerKey(p: MaterialProviderTO): string {
    if (p.id != null) return `id:${p.id}`;
    return `name:${(p.name ?? '').trim().toLowerCase()}`;
}

export function MaterialProvidersManagementPanel() {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<MaterialProviderTO[]>([]);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<MaterialProviderTO | null>(null);
    const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
    const [materialsDialogProvider, setMaterialsDialogProvider] = useState<MaterialProviderTO | null>(null);
    const [materialsCatalog, setMaterialsCatalog] = useState<MaterialTO[]>([]);

    const sortedProviders = useMemo(
        () => [...providers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        [providers],
    );

    const editingProvider = useMemo(
        () => (editingKey ? providers.find((p) => providerKey(p) === editingKey) ?? null : null),
        [editingKey, providers],
    );

    const loadProviders = () => {
        Server.getAllMaterialProviders(
            (response: unknown) => {
                const r = response as { data?: MaterialProviderTO[] | { data?: MaterialProviderTO[] } };
                const data = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
                setProviders(data);
            },
            () => {},
        );
    };

    const loadMaterialsCatalog = (onDone?: () => void) => {
        Server.getAllMaterials(
            (response: unknown) => {
                const r = response as { data?: MaterialTO[] | { data?: MaterialTO[] } };
                const data = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
                setMaterialsCatalog(data);
                onDone?.();
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    useEffect(() => {
        loadMaterialsCatalog();
        loadProviders();
    }, []);

    const addOrUpdateProvider = (values: MaterialProviderFormValues) => {
        const newProvider: MaterialProviderTO = {
            id: editingKey ? providers.find((p) => providerKey(p) === editingKey)?.id : undefined,
            name: values.name.trim(),
            contactPerson: values.contactPerson.trim(),
            emailAddress: values.emailAddress.trim(),
            phoneNumber: values.phoneNumber.trim(),
            grade: editingKey ? providers.find((p) => providerKey(p) === editingKey)?.grade ?? 0 : 0,
        };

        if (!editingKey) {
            Server.addMaterialProvider(
                newProvider,
                () => {
                    loadProviders();
                    toastActionSuccess(t('toastMaterialProviderSaved'));
                },
                (err: unknown) => toastServerError(err, t),
            );
            return;
        }

        Server.editMaterialProvider(
            newProvider,
            () => {
                loadProviders();
                setEditingKey(null);
                toastActionSuccess(t('toastMaterialProviderSaved'));
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const confirmDeleteProvider = () => {
        if (!providerToDelete?.id) return;
        const key = providerKey(providerToDelete);
        Server.deleteMaterialProvider(
            providerToDelete.id,
            () => {
                setProviderToDelete(null);
                loadProviders();
                toastActionSuccess(t('toastMaterialProviderDeleted'));
                if (editingKey === key) setEditingKey(null);
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    const openMaterialsDialog = (provider: MaterialProviderTO) => {
        loadMaterialsCatalog(() => {
            setMaterialsDialogProvider(provider);
            setMaterialsDialogOpen(true);
        });
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('materialProvidersManagement')}</Typography>

            <Paper sx={{ p: 2 }}>
                <MaterialProviderFormSection
                    editingProvider={editingProvider}
                    onSubmit={addOrUpdateProvider}
                    onCancelEdit={() => setEditingKey(null)}
                />

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('materialProviderName')}</TableCell>
                                <TableCell>{t('materialProviderContact')}</TableCell>
                                <TableCell>{t('materialProviderEmail')}</TableCell>
                                <TableCell>{t('materialProviderPhone')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedProviders.length > 0 ? sortedProviders.map((p) => (
                                <TableRow key={providerKey(p)}>
                                    <TableCell>{p.name ?? '—'}</TableCell>
                                    <TableCell>{p.contactPerson ?? '—'}</TableCell>
                                    <TableCell>{p.emailAddress ?? '—'}</TableCell>
                                    <TableCell>{p.phoneNumber ?? '—'}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => setEditingKey(providerKey(p))} title={t('edit')}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => openMaterialsDialog(p)} title={t('materialsEditTooltip')}>
                                                <Typography component="span" sx={{ fontSize: '0.95rem', fontWeight: 800, color: 'secondary.main', lineHeight: 1 }}>M</Typography>
                                            </IconButton>
                                            <IconButton size="small" sx={tableActionIconButtonSx.delete} onClick={() => setProviderToDelete(p)} title={t('remove')}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableActionsRow>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary">{t('noMaterialProviders')}</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ConfirmationModal open={!!providerToDelete} modalMessage={t('confirmDeleteMaterialProvider')} onConfirm={confirmDeleteProvider} onModalClose={() => setProviderToDelete(null)} />

            <MaterialsCatalogDialog
                open={materialsDialogOpen}
                provider={materialsDialogProvider}
                providers={providers}
                materialsCatalog={materialsCatalog}
                onClose={() => { setMaterialsDialogOpen(false); setMaterialsDialogProvider(null); }}
                onCatalogRefresh={loadMaterialsCatalog}
            />
        </Box>
    );
}
