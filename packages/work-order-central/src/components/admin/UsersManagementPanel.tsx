import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplicationUserTO } from 'sf-common/src/models/ApiRequests';
import { Server, ConfirmationModal } from 'sf-common';
import {
    TableActionsRow,
    tableActionsTableCellSx,
    tableActionIconButtonSx,
} from '../shared/tableActions';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

export function UsersManagementPanel() {
    const { t } = useTranslation();

    const [users, setUsers] = useState<ApplicationUserTO[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string  | undefined>(undefined);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
    const [userToDelete, setUserToDelete] = useState<ApplicationUserTO | null>(null);

    const formatCreatedDate = (value: any): string => {
        if (!value) {
            return '';
        }

        // If backend sends LocalDateTime as array [year, month, day, hour, minute, second,...]
        if (Array.isArray(value)) {
            const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = value;
            const d = new Date(year, month - 1, day, hour, minute, second);
            return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
        }

        // If backend sends ISO string
        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
        }

        return '';
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        Server.getAllUsers(
            (response: any) => {
                let data: ApplicationUserTO[] = [];

                if (Array.isArray(response?.data)) {
                    data = response.data;
                } else if (Array.isArray(response?.data?.data)) {
                    data = response.data.data;
                }

                setUsers(data);
            },
            () => {
            }
        );
    };

    const resetForm = () => {
        setSelectedUserId(undefined);
        setName('');
        setSurname('');
        setQrCode('');
        setRole('OPERATOR');
    };

    const handleEditClick = (user: ApplicationUserTO) => {
        setSelectedUserId(user.id);
        setName(user.name || '');
        setSurname(user.surname || '');
        setQrCode(user.qrCode || '');
        setRole(user.role || 'OPERATOR');
    };

    const handleSubmit = () => {
        const payload: ApplicationUserTO = {
            id: selectedUserId,
            name,
            surname,
            qrCode,
            role,
        };

        const onSuccess = () => {
            loadUsers();
            resetForm();
            toastActionSuccess(selectedUserId ? t('toastUserUpdated') : t('toastUserAdded'));
        };

        if (selectedUserId) {
            Server.editUser(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        } else {
            Server.addUser(payload, onSuccess, (err: unknown) => toastServerError(err, t));
        }
    };

    const handleDeleteClick = (user: ApplicationUserTO) => {
        setUserToDelete(user);
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
        <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 320, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('usersManagement')}
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
                        label={t('surname')}
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('qrCode')}
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        select
                        label={t('role')}
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OPERATOR')}
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="OPERATOR">{t('operator')}</MenuItem>
                        <MenuItem value="ADMIN">{t('admin')}</MenuItem>
                    </TextField>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            {selectedUserId ? t('editUser') : t('addUser')}
                        </Button>
                        <Button variant="outlined" onClick={resetForm}>
                            {t('reset')}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ flex: 2, minWidth: 400, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('usersList')}
                </Typography>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('name')}</TableCell>
                                <TableCell>{t('surname')}</TableCell>
                                <TableCell>{t('qrCode')}</TableCell>
                                <TableCell>{t('role')}</TableCell>
                                <TableCell>{t('createdDate')}</TableCell>
                                <TableCell align="right" sx={tableActionsTableCellSx}>
                                    {t('actions')}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id || `${user.name}-${user.qrCode}`}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.surname}</TableCell>
                                    <TableCell>{user.qrCode}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        {formatCreatedDate(user.createdDate as any)}
                                    </TableCell>
                                    <TableCell align="right" sx={tableActionsTableCellSx}>
                                        <TableActionsRow>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditClick(user)}
                                                sx={tableActionIconButtonSx.edit}
                                            >
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(user)}
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
                open={!!userToDelete}
                modalMessage={t('confirmDeleteUser')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setUserToDelete(null)}
            />
        </Box>
    );
}

