import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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

interface LocalApplicationUser extends ApplicationUserTO {
    id?: string | number;
}

export function UsersManagementPanel() {
    const { t } = useTranslation();

    const [users, setUsers] = useState<LocalApplicationUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | number | undefined>(undefined);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
    const [accountStatus, setAccountStatus] = useState<string>('');
    const [userToDelete, setUserToDelete] = useState<LocalApplicationUser | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        Server.getAllUsers(
            (response: any) => {
                let data: LocalApplicationUser[] = [];

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
        setAccountStatus('');
    };

    const handleEditClick = (user: LocalApplicationUser) => {
        setSelectedUserId(user.id);
        setName(user.name || '');
        setSurname(user.surname || '');
        setQrCode(user.qrCode || '');
        setRole(user.role || 'OPERATOR');
        setAccountStatus(user.accountStatus || '');
    };

    const handleSubmit = () => {
        const payload: ApplicationUserTO = {
            id: selectedUserId,
            name,
            surname,
            qrCode,
            role,
            accountStatus,
        };

        const onSuccess = () => {
            loadUsers();
            resetForm();
        };

        if (selectedUserId) {
            Server.editUser(payload, onSuccess, () => {});
        } else {
            Server.addUser(payload, onSuccess, () => {});
        }
    };

    const handleDeleteClick = (user: LocalApplicationUser) => {
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
            },
            () => {
                setUserToDelete(null);
            }
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
                        label={t('role')}
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OPERATOR')}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label={t('accountStatus')}
                        value={accountStatus}
                        onChange={(e) => setAccountStatus(e.target.value)}
                        size="small"
                        fullWidth
                    />

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
                                <TableCell>{t('accountStatus')}</TableCell>
                                <TableCell align="right">{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id || `${user.name}-${user.qrCode}`}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.surname}</TableCell>
                                    <TableCell>{user.qrCode}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>{user.accountStatus}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditClick(user)}
                                            sx={{ mr: 1 }}
                                        >
                                            <LinkIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteClick(user)}
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
                open={!!userToDelete}
                modalMessage={t('confirmDeleteUser')}
                onConfirm={handleConfirmDelete}
                onModalClose={() => setUserToDelete(null)}
            />
        </Box>
    );
}

