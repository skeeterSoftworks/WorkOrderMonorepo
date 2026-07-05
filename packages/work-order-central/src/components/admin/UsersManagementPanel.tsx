import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplicationUserTO } from 'sf-common/src/models/ApiRequests';
import { formatUserRolesLabel } from 'sf-common/src/auth/applicationRoles';
import { formatEuropeanDateTime } from 'sf-common/src/util/DateUtils';
import { Server, ConfirmationModal } from 'sf-common';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';
import { UserFormDialog } from './UserFormDialog';

export function UsersManagementPanel() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<ApplicationUserTO[]>([]);
    const [editingUser, setEditingUser] = useState<ApplicationUserTO | null>(null);
    const [userToDelete, setUserToDelete] = useState<ApplicationUserTO | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);

    const formatCreatedDate = (value: unknown): string => {
        if (!value) return '';
        if (Array.isArray(value)) {
            const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value as number[];
            const d = new Date(year, month - 1, day, hour, minute, second);
            return Number.isNaN(d.getTime()) ? '' : formatEuropeanDateTime(d);
        }
        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? value : formatEuropeanDateTime(d);
        }
        return '';
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        Server.getAllUsers(
            (response: { data?: ApplicationUserTO[] | { data?: ApplicationUserTO[] } }) => {
                let data: ApplicationUserTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                setUsers(data);
            },
            () => {},
        );
    };

    const openFormModal = () => {
        setEditingUser(null);
        setFormModalOpen(true);
    };

    const closeFormModal = () => {
        setFormModalOpen(false);
        setEditingUser(null);
    };

    const handleConfirmDelete = () => {
        if (!userToDelete?.id) {
            setUserToDelete(null);
            return;
        }
        Server.deleteUser(
            Number(userToDelete.id),
            () => {
                loadUsers();
                setUserToDelete(null);
                toastActionSuccess(t('toastUserDeleted'));
            },
            (err: unknown) => {
                setUserToDelete(null);
                toastServerError(err, t);
            },
        );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('usersManagement')}</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openFormModal}>
                    {t('addUser')}
                </Button>
            </Box>

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>{t('usersList')}</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('name')}</TableCell>
                                <TableCell>{t('surname')}</TableCell>
                                <TableCell>{t('qrCode')}</TableCell>
                                <TableCell>{t('roles')}</TableCell>
                                <TableCell>{t('createdDate')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id || `${user.name}-${user.qrCode}`}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.surname}</TableCell>
                                    <TableCell>{user.qrCode}</TableCell>
                                    <TableCell>{formatUserRolesLabel(user, t)}</TableCell>
                                    <TableCell>{formatCreatedDate(user.createdDate)}</TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton size="small" onClick={() => { setEditingUser(user); setFormModalOpen(true); }} sx={tableActionIconButtonSx.edit}>
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => setUserToDelete(user)} sx={tableActionIconButtonSx.delete}>
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

            <UserFormDialog open={formModalOpen} user={editingUser} onClose={closeFormModal} onSaved={loadUsers} />

            <ConfirmationModal
                open={!!userToDelete}
                modalMessage={t('confirmDeleteUser')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setUserToDelete(null)}
            />
        </Box>
    );
}
