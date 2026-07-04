import {Box, Button, Stack, Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
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
        <Box
            sx={{
                width: '100%',
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
            }}
        >
            <Stack direction="row" spacing={4} useFlexGap flexWrap="wrap" justifyContent="center">
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
                <Button
                    component={Link}
                    to="/incoming-products"
                    variant="contained"
                    sx={homeButtonStyle}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                        <Typography
                            component="span"
                            sx={{fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2}}
                        >
                            {t('incomingProductsReception')}
                        </Typography>
                        <Inventory2OutlinedIcon sx={{fontSize: 34}} />
                    </Box>
                </Button>
                <Button
                    component={Link}
                    to="/stock"
                    variant="contained"
                    sx={homeButtonStyle}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                        <Typography
                            component="span"
                            sx={{fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2}}
                        >
                            {t('stock')}
                        </Typography>
                        <WarehouseIcon sx={{fontSize: 34}} />
                    </Box>
                </Button>
            </Stack>
        </Box>
    );
}
