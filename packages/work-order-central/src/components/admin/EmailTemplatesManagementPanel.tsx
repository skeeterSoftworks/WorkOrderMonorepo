import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server } from 'sf-common';
import type { EmailTemplateCode, EmailTemplateTO } from 'sf-common/src/models/ApiRequests';
import { toastActionSuccess, toastServerError } from '../../util/actionToast';

const TEMPLATE_CODES: EmailTemplateCode[] = [
    'MATERIAL_ORDER_INQUIRY',
    'MATERIAL_ORDER_REMINDER',
    'MATERIAL_DELIVERY_LATE',
];

function unwrapTemplates(response: unknown): EmailTemplateTO[] {
    const r = response as { data?: EmailTemplateTO[] };
    if (Array.isArray(r?.data)) return r.data;
    return [];
}

export function EmailTemplatesManagementPanel() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draftByCode, setDraftByCode] = useState<Record<string, { subject: string; body: string }>>({});
    const [savingCode, setSavingCode] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setLoadError(null);
        Server.getEmailTemplates(
            (resp: unknown) => {
                const list = unwrapTemplates(resp);
                const next: Record<string, { subject: string; body: string }> = {};
                for (const code of TEMPLATE_CODES) {
                    const row = list.find((x) => x.code === code);
                    next[code] = {
                        subject: row?.subjectTemplate ?? '',
                        body: row?.bodyTemplate ?? '',
                    };
                }
                setDraftByCode(next);
                setLoading(false);
            },
            () => {
                setLoadError(t('emailTemplatesLoadError'));
                setLoading(false);
            },
        );
    }, [t]);

    const updateDraft = (code: EmailTemplateCode, field: 'subject' | 'body', value: string) => {
        setDraftByCode((prev) => ({
            ...prev,
            [code]: {
                subject: field === 'subject' ? value : (prev[code]?.subject ?? ''),
                body: field === 'body' ? value : (prev[code]?.body ?? ''),
            },
        }));
    };

    const saveOne = (code: EmailTemplateCode) => {
        const draft = draftByCode[code];
        if (!draft) return;
        setSavingCode(code);
        const payload: EmailTemplateTO = {
            code,
            subjectTemplate: draft.subject,
            bodyTemplate: draft.body,
        };
        Server.saveEmailTemplate(
            payload,
            () => {
                setSavingCode(null);
                toastActionSuccess(t('toastEmailTemplateSaved'));
            },
            (err: unknown) => {
                setSavingCode(null);
                toastServerError(err, t);
            },
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (loadError) {
        return (
            <Alert severity="warning" sx={{ mb: 2 }}>
                {loadError}
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
                {t('emailTemplates')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('emailTemplatesAdminIntro')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {t('emailTemplatePlaceholdersHint')}
            </Typography>

            {TEMPLATE_CODES.map((code) => (
                <Paper key={code} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {t(`emailTemplate_${code}`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {code}
                    </Typography>
                    <TextField
                        label={t('emailTemplateSubject')}
                        value={draftByCode[code]?.subject ?? ''}
                        onChange={(e) => updateDraft(code, 'subject', e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1.5 }}
                    />
                    <TextField
                        label={t('emailTemplateBody')}
                        value={draftByCode[code]?.body ?? ''}
                        onChange={(e) => updateDraft(code, 'body', e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={8}
                    />
                    <Divider sx={{ my: 1.5 }} />
                    <Button
                        variant="contained"
                        onClick={() => saveOne(code)}
                        disabled={savingCode === code}
                    >
                        {t('saveAction')}
                    </Button>
                </Paper>
            ))}
        </Box>
    );
}
