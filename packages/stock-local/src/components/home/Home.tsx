import {Box, Grid, IconButton, Tooltip} from '@mui/material';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import WarehouseIcon from '@mui/icons-material/Warehouse';

export function Home() {
    const {t} = useTranslation();

    const homeIconButtonStyle = {
        height: '18vh',
        width: '18vh',
        borderRadius: '20px',
        boxShadow: 4,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': {
            bgcolor: 'primary.dark',
        },
    };

    return (
        <Box sx={{position: 'relative', width: '100%', minHeight: '60vh'}}>
            <Grid
                container
                spacing={4}
                sx={{minHeight: '60vh', alignItems: 'center', justifyContent: 'center'}}
            >
                <Grid item xs="auto" sx={{textAlign: 'center'}}>
                    <Tooltip title={t('incomingMaterialReception')}>
                        <IconButton
                            component={Link}
                            to="/incoming-material"
                            aria-label={t('incomingMaterialReception')}
                            sx={homeIconButtonStyle}
                        >
                            <MoveToInboxIcon sx={{fontSize: '4.5rem'}} />
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs="auto" sx={{textAlign: 'center'}}>
                    <Tooltip title={t('stockByLocation')}>
                        <IconButton
                            component={Link}
                            to="/stock-by-location"
                            aria-label={t('stockByLocation')}
                            sx={homeIconButtonStyle}
                        >
                            <WarehouseIcon sx={{fontSize: '4.5rem'}} />
                        </IconButton>
                    </Tooltip>
                </Grid>
            </Grid>
        </Box>
    );
}
