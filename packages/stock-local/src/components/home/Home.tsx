import {Box, Button, Grid} from '@mui/material';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

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
            <Grid container sx={{minHeight: '60vh', alignItems: 'center', justifyContent: 'center'}}>
                <Grid item xs="auto" sx={{textAlign: 'center'}}>
                    <Button
                        component={Link}
                        to="/materials-stock"
                        variant="contained"
                        sx={homeButtonStyle}
                    >
                        {t('materialsStock')}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}
