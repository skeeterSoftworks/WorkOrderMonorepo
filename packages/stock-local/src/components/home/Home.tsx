import {Box, Button, Grid, Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import WarehouseIcon from '@mui/icons-material/Warehouse';

export function Home() {
    const {t} = useTranslation();

    const homeButtonStyle: Record<string, unknown> = {
        height: '18vh',
        width: '18vh',
        borderRadius: '20px',
        textTransform: 'none',
        fontSize: '1.1rem',
        fontWeight: 600,
        boxShadow: 4,
    };

    return (
        <Box sx={{position: 'relative', width: '100%', minHeight: '60vh'}}>
            <Grid
                container
                spacing={4}
                sx={{minHeight: '60vh', alignItems: 'center', justifyContent: 'center'}}
            >
                <Grid item xs="auto" sx={{textAlign: 'center'}}>
                    <Button
                        component={Link}
                        to="/incoming-material"
                        variant="contained"
                        sx={homeButtonStyle}
                    >
                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                            <Typography
                                component="span"
                                sx={{fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2}}
                            >
                                {t('incomingMaterialReception')}
                            </Typography>
                            <MoveToInboxIcon sx={{fontSize: 34}} />
                        </Box>
                    </Button>
                </Grid>
                <Grid item xs="auto" sx={{textAlign: 'center'}}>
                    <Button
                        component={Link}
                        to="/stock-by-location"
                        variant="contained"
                        sx={homeButtonStyle}
                    >
                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                            <Typography
                                component="span"
                                sx={{fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2}}
                            >
                                {t('stockByLocation')}
                            </Typography>
                            <WarehouseIcon sx={{fontSize: 34}} />
                        </Box>
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}
