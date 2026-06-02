import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MaterialOrderReceptionTO } from 'sf-common/src/models/ApiRequests';
import {
    emptySampleInputs,
    getDefinedMaterialDimensions,
    getNominalDimensionValue,
    isInternalControlFormComplete,
    overallFieldsFromInternalControl,
    type InternalControlSubmitData,
    type MaterialDimensionKey,
    type SampleInputs,
    sampleInputsFromInternalControl,
} from './materialValidationUtils';

const DIMENSION_LABEL_KEYS: Record<MaterialDimensionKey, string> = {
    diameter: 'diameterMeasurement',
    length: 'materialLength',
    width: 'materialWidth',
    weight: 'materialWeight',
};

type Props = {
    open: boolean;
    reception: MaterialOrderReceptionTO | null;
    submitting?: boolean;
    onClose: () => void;
    onSubmit: (form: InternalControlSubmitData) => void;
    onMeasureLater: () => void;
};

export function MaterialInternalControlDialog({
    open,
    reception,
    submitting = false,
    onClose,
    onSubmit,
    onMeasureLater,
}: Props) {
    const { t } = useTranslation();
    const [samples, setSamples] = useState<SampleInputs>(emptySampleInputs());
    const [overallWeight, setOverallWeight] = useState('');
    const [overallAcceptance, setOverallAcceptance] = useState<boolean | null>(null);

    const definedDimensions = useMemo(
        () => (reception ? getDefinedMaterialDimensions(reception) : []),
        [reception],
    );

    useEffect(() => {
        if (!open || !reception) {
            setSamples(emptySampleInputs());
            setOverallWeight('');
            setOverallAcceptance(null);
            return;
        }
        setSamples(sampleInputsFromInternalControl(reception.internalControl));
        const overall = overallFieldsFromInternalControl(reception.internalControl);
        setOverallWeight(overall.overallWeight);
        setOverallAcceptance(overall.overallAcceptance);
    }, [open, reception]);

    const canSubmit =
        reception != null &&
        isInternalControlFormComplete(reception, samples, overallWeight, overallAcceptance);

    const updateSample = (dimension: MaterialDimensionKey, index: number, value: string) => {
        setSamples((prev) => {
            const row = [...prev[dimension]] as [string, string, string];
            row[index] = value;
            return { ...prev, [dimension]: row };
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('materialInternalControlTitle')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    {reception?.materialOrderCode ? `${reception.materialOrderCode} — ` : ''}
                    {reception?.materialName || reception?.materialCode} — {reception?.materialProviderName}
                </Typography>
                {definedDimensions.length === 0 ? (
                    <Typography variant="body2">{t('materialInternalControlNoDimensions')}</Typography>
                ) : (
                    definedDimensions.map((dimension) => {
                        const nominal = reception ? getNominalDimensionValue(reception, dimension) : undefined;
                        return (
                            <Box key={dimension}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    {t(DIMENSION_LABEL_KEYS[dimension])}
                                    {nominal != null ? ` (${t('nominalValue')}: ${nominal})` : ''}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                    {[0, 1, 2].map((index) => (
                                        <TextField
                                            key={index}
                                            label={t('sampleNumber', { n: index + 1 })}
                                            type="number"
                                            size="small"
                                            value={samples[dimension][index]}
                                            onChange={(e) => updateSample(dimension, index, e.target.value)}
                                            inputProps={{ step: 'any' }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        );
                    })
                )}
                <TextField
                    label={t('overallWeight')}
                    type="number"
                    size="small"
                    required
                    value={overallWeight}
                    onChange={(e) => setOverallWeight(e.target.value)}
                    inputProps={{ step: 'any', min: 0 }}
                    fullWidth
                />
                <FormControl component="fieldset" variant="standard" required>
                    <FormLabel component="legend">{t('overallAcceptance')}</FormLabel>
                    <RadioGroup
                        row
                        value={overallAcceptance === null ? '' : overallAcceptance ? 'accepted' : 'rejected'}
                        onChange={(e) => setOverallAcceptance(e.target.value === 'accepted')}
                    >
                        <FormControlLabel
                            value="accepted"
                            control={<Radio size="small" />}
                            label={t('overallAcceptanceAccepted')}
                        />
                        <FormControlLabel
                            value="rejected"
                            control={<Radio size="small" />}
                            label={t('overallAcceptanceRejected')}
                        />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onMeasureLater} disabled={submitting}>
                    {t('measureSamplesLater')}
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} disabled={submitting}>
                    {t('cancel')}
                </Button>
                <Button
                    variant="contained"
                    disabled={submitting || !canSubmit}
                    onClick={() => {
                        if (overallAcceptance === null) return;
                        onSubmit({ samples, overallWeight, overallAcceptance });
                    }}
                >
                    {t('submitInternalControl')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
