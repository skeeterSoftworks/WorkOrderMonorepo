import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';

interface Props {
    draftCatalogueId: string;
    catalogueOptions: string[];
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
}

export function StockLocationCatalogueFilterBar({
    draftCatalogueId,
    catalogueOptions,
    onDraftChange,
    onSubmit,
    disabled = false,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box
            component="form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}
        >
            <Autocomplete
                freeSolo
                options={catalogueOptions}
                inputValue={draftCatalogueId}
                onInputChange={(_, value) => onDraftChange(value)}
                disabled={disabled}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={t('catalogueId')}
                        size="small"
                        sx={{ minWidth: 220 }}
                        autoComplete="off"
                    />
                )}
            />
            <Button type="submit" variant="contained" disabled={disabled}>
                {t('searchAction')}
            </Button>
        </Box>
    );
}
