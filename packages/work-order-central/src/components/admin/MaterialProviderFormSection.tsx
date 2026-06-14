import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import type { MaterialProviderTO } from 'sf-common/src/models/ApiRequests';

export type MaterialProviderFormValues = {
    name: string;
    contactPerson: string;
    emailAddress: string;
    phoneNumber: string;
};

type Props = {
    editingProvider: MaterialProviderTO | null;
    onSubmit: (values: MaterialProviderFormValues) => void;
    onCancelEdit: () => void;
};

const emptyValues = (): MaterialProviderFormValues => ({
    name: '',
    contactPerson: '',
    emailAddress: '',
    phoneNumber: '',
});

export function MaterialProviderFormSection({ editingProvider, onSubmit, onCancelEdit }: Props) {
    const { t } = useTranslation();
    const [values, setValues] = useState<MaterialProviderFormValues>(emptyValues);

    useEffect(() => {
        if (editingProvider) {
            setValues({
                name: editingProvider.name ?? '',
                contactPerson: editingProvider.contactPerson ?? '',
                emailAddress: editingProvider.emailAddress ?? '',
                phoneNumber: editingProvider.phoneNumber ?? '',
            });
        } else {
            setValues(emptyValues());
        }
    }, [editingProvider?.id]);

    const isFormValid =
        Boolean(values.name.trim()) &&
        Boolean(values.contactPerson.trim()) &&
        Boolean(values.emailAddress.trim()) &&
        Boolean(values.phoneNumber.trim());

    const update = (key: keyof MaterialProviderFormValues, value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField required label={t('materialProviderName')} value={values.name} onChange={(e) => update('name', e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                <TextField required label={t('materialProviderContact')} value={values.contactPerson} onChange={(e) => update('contactPerson', e.target.value)} size="small" sx={{ flex: '1 1 180px' }} />
                <TextField required label={t('materialProviderEmail')} value={values.emailAddress} onChange={(e) => update('emailAddress', e.target.value)} size="small" sx={{ flex: '1 1 220px' }} />
                <TextField required label={t('materialProviderPhone')} value={values.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} size="small" sx={{ flex: '1 1 160px' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => onSubmit(values)} disabled={!isFormValid}>
                    {editingProvider ? t('updateProvider') : t('addProvider')}
                </Button>
                {editingProvider && (
                    <Button variant="outlined" onClick={onCancelEdit}>{t('cancel')}</Button>
                )}
            </Box>
        </Box>
    );
}
