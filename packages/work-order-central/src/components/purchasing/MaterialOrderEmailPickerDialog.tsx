import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { EmailTemplateCode, MaterialOrderTO, MaterialProviderTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';
import { toastServerError } from '../../util/actionToast';

const MATERIAL_ORDER_EMAIL_TEMPLATE_CODES: EmailTemplateCode[] = [
    'MATERIAL_ORDER_INQUIRY',
    'MATERIAL_ORDER_REMINDER',
    'MATERIAL_DELIVERY_LATE',
];

type Props = {
    open: boolean;
    order: MaterialOrderTO | null;
    provider: MaterialProviderTO | undefined;
    onClose: () => void;
};

export function MaterialOrderEmailPickerDialog({ open, order, provider, onClose }: Props) {
    const { t } = useTranslation();
    const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<EmailTemplateCode>('MATERIAL_ORDER_INQUIRY');

    useEffect(() => {
        if (open) {
            setSelectedEmailTemplate('MATERIAL_ORDER_INQUIRY');
        }
    }, [open, order?.id]);

    const confirmMaterialOrderEmail = () => {
        const email = provider?.emailAddress?.trim();
        if (!order?.id || !email) return;
        Server.renderMaterialOrderEmail(
            selectedEmailTemplate,
            order.id,
            (resp) => {
                const subject = resp.data.subject ?? '';
                const body = resp.data.body ?? '';
                const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailto;
                onClose();
            },
            (err: unknown) => toastServerError(err, t),
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('emailTemplatePickerTitle')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('emailTemplatePlaceholdersHint')}
                </Typography>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <FormLabel component="legend">{t('emailTemplatePickerChooseLabel')}</FormLabel>
                    <RadioGroup
                        value={selectedEmailTemplate}
                        onChange={(e) => setSelectedEmailTemplate(e.target.value as EmailTemplateCode)}
                    >
                        {MATERIAL_ORDER_EMAIL_TEMPLATE_CODES.map((code) => (
                            <FormControlLabel
                                key={code}
                                value={code}
                                control={<Radio size="small" />}
                                label={t(`emailTemplate_${code}`)}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button variant="contained" onClick={confirmMaterialOrderEmail}>
                        {t('emailTemplatePickerOpenMailto')}
                    </Button>
                    <Button variant="outlined" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
