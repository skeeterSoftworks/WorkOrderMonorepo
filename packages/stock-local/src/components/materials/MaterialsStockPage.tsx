import {Box, Typography} from '@mui/material';
import {useTranslation} from 'react-i18next';

export function MaterialsStockPage() {
    const {t} = useTranslation();

    return (
        <Box sx={{py: 4, textAlign: 'center'}}>
            <Typography variant="h5" component="h1" gutterBottom>
                {t('materialsStock')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                {t('materialsStockStubMessage')}
            </Typography>
        </Box>
    );
}
