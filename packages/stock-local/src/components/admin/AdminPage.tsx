import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import { RoleAccessGuard, canAccessStockLocalAdmin, readLoggedUser } from 'sf-common';

export function AdminPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const user = readLoggedUser();

    return (
        <RoleAccessGuard user={user} allowed={canAccessStockLocalAdmin(user)}>
            <Container maxWidth="sm" sx={{py: 2}}>
                <AppBar position="static" sx={{mb: 2}}>
                    <Toolbar>
                        <IconButton color="inherit" edge="start" onClick={() => navigate('/')} sx={{mr: 1}} aria-label={t('backToHome')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">{t('adminPage')}</Typography>
                    </Toolbar>
                </AppBar>
                <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    {t('adminPageDescription')}
                </Typography>
                <Box component="nav">
                    <List>
                        <ListItemButton onClick={() => navigate('/admin/machine-details')}>
                            <ListItemText primary={t('machineDetailsMenu')} />
                        </ListItemButton>
                    </List>
                </Box>
            </Container>
        </RoleAccessGuard>
    );
}
