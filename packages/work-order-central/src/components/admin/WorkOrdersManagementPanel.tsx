import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export function WorkOrdersManagementPanel() {
    const { t } = useTranslation();

    return (
        <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {t('workOrdersManagement')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('workOrdersManagementStub')}
                </Typography>
            </Paper>
        </Box>
    );
}

