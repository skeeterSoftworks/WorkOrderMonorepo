import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WorkOrdersManagementPanel } from '../admin/WorkOrdersManagementPanel';

export function WorkOrdersManagementPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <IconButton color="inherit" onClick={() => navigate('/')} sx={{ mr: 1 }} aria-label={t('backToHome')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">
                        {t('workOrders')}
                    </Typography>
                </Toolbar>
            </AppBar>
            <WorkOrdersManagementPanel />
        </Container>
    );
}
