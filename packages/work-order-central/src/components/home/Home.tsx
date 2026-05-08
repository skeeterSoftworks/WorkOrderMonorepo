import { Box, Button, Grid, Typography } from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import type { LoggedUser } from '../../models/Common.ts';
import { useTranslation } from 'react-i18next';

export function Home() {
    const userDataString = sessionStorage.getItem('userData');
    const userData: LoggedUser = userDataString && JSON.parse(userDataString);
    const { t } = useTranslation();

    const homeButtonStyle: Record<string, unknown> = {
        height: '20vh',
        width: '20vh',
        borderRadius: '20px',
        textTransform: 'none',
        fontSize: '1.2rem',
        fontWeight: 600,
        boxShadow: 4,
    };

    return (
        <Grid container sx={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
            {userData && userData.role === 'ADMIN' && (
                <Grid container spacing={3} sx={{ maxWidth: 1100, justifyContent: 'center' }}>
                    <Grid item xs="auto" sx={{ textAlign: 'center' }}>
                        <Button href="/work-orders" variant="contained" sx={homeButtonStyle}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" sx={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.2 }}>
                                    {t('workOrders')}
                                </Typography>
                                <WorkOutlineIcon sx={{ fontSize: 34 }} />
                            </Box>
                        </Button>
                    </Grid>
                    <Grid item xs="auto" sx={{ textAlign: 'center' }}>
                        <Button href="/stock" variant="contained" sx={homeButtonStyle}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" sx={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.2 }}>
                                    {t('stock')}
                                </Typography>
                                <Inventory2OutlinedIcon sx={{ fontSize: 34 }} />
                            </Box>
                        </Button>
                    </Grid>
                    <Grid item xs="auto" sx={{ textAlign: 'center' }}>
                        <Button href="/admin" variant="contained" sx={homeButtonStyle}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" sx={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.2 }}>
                                    {t('admin')}
                                </Typography>
                                <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 34 }} />
                            </Box>
                        </Button>
                    </Grid>
                    <Grid item xs="auto" sx={{ textAlign: 'center' }}>
                        <Button href="/monitoring-client" variant="contained" sx={homeButtonStyle}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <Typography component="span" sx={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.2 }}>
                                    {t('monitoringClient')}
                                </Typography>
                                <MonitorHeartOutlinedIcon sx={{ fontSize: 34 }} />
                            </Box>
                        </Button>
                    </Grid>
                </Grid>
            )}
        </Grid>
    );
}
