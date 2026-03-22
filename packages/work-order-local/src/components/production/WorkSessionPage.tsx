import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

/** Placeholder until work session flow is implemented. */
export function WorkSessionPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <IconButton color="inherit" onClick={() => navigate('/production')} sx={{mr: 1}} aria-label={t('backToHome')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">{t('workSession')}</Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{mt: 3}}>
                <Typography color="text.secondary">{t('workSessionPanelTbd')}</Typography>
            </Box>
        </Container>
    );
}
