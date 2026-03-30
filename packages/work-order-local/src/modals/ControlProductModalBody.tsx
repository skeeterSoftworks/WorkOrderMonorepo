import {type ReactNode, useState} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Backdrop from '@mui/material/Backdrop';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {useTranslation} from 'react-i18next';
import type {MeasuringFeaturePrototypeTO, WorkSessionMeasuringFeatureInputTO} from '../models/ApiRequests';
import {filterDecimalNumericInput} from '../util/decimalNumericInput';
import {measuredValueToleranceHint} from './workSessionMeasuringHelpers';

function technicalDrawingImageSrc(b64: string | undefined): string | undefined {
    if (!b64?.trim()) return undefined;
    return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
}

function TechnicalDrawingColumn({base64}: {base64?: string}) {
    const {t} = useTranslation();
    const [zoomed, setZoomed] = useState(false);
    const src = technicalDrawingImageSrc(base64);
    return (
        <>
            <Box
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    height: '100%',
                    minHeight: {xs: 120, md: 280},
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="caption" color="text.secondary" sx={{alignSelf: 'flex-start', mb: 0.5}}>
                    {t('technicalDrawing')}
                </Typography>
                {src ? (
                    <Box
                        component="img"
                        src={src}
                        alt=""
                        onClick={() => setZoomed(true)}
                        sx={{
                            width: '100%',
                            flex: 1,
                            minHeight: {xs: 160, md: 200},
                            maxHeight: {xs: 280, md: 'min(58vh, 560px)'},
                            objectFit: 'contain',
                            cursor: 'zoom-in',
                            borderRadius: 0.5,
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{py: 2, textAlign: 'center'}}>
                        {t('technicalDrawingNone')}
                    </Typography>
                )}
            </Box>
            {src ? (
                <Backdrop
                    open={zoomed}
                    onClick={() => setZoomed(false)}
                    sx={(theme) => ({
                        zIndex: theme.zIndex.modal + 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    })}
                >
                    <Box
                        component="img"
                        src={src}
                        alt=""
                        onClick={() => setZoomed(false)}
                        sx={{
                            maxHeight: '100vh',
                            maxWidth: '100vw',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            cursor: 'zoom-out',
                            p: 1,
                            boxSizing: 'border-box',
                        }}
                    />
                </Backdrop>
            ) : null}
        </>
    );
}

function MeasuringFeaturesForm({
    prototypes,
    assessments,
    onAssessmentChange,
}: {
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean,
    ) => void;
}) {
    const {t} = useTranslation();
    return (
        <Stack spacing={2} sx={{mt: 1}}>
            {prototypes.map((proto, index) => {
                const assessment = assessments[index];
                const checkType = proto.checkType;
                const isMeasured = checkType === 'MEASURED';
                const isAttributive = checkType === 'ATTRIBUTIVE';
                const assessedValue = typeof assessment?.assessedValue === 'string' ? assessment.assessedValue : '';
                const assessedValueGood = Boolean(assessment?.assessedValueGood);
                const rangeHint = isMeasured
                    ? measuredValueToleranceHint(assessedValue, proto.minTolerance, proto.maxTolerance)
                    : 'none';

                return (
                    <Box
                        key={proto.catalogueId ?? index}
                        sx={{border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5}}
                    >
                        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="stretch">
                            <Box sx={{flex: 1, minWidth: 220}}>
                                <Typography variant="body2">
                                    {t('catalogueId')}: {proto.catalogueId ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('class')}: {proto.classType ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('frequency')}: {proto.frequency ?? '—'}
                                </Typography>
                            </Box>

                            <Box sx={{flex: 1, minWidth: 240}}>
                                <Typography variant="body2">
                                    {t('toolType')}: {proto.toolType ?? '—'}
                                </Typography>
                                <Typography variant="body2">
                                    {t('measuringTool')}: {proto.measuringTool ?? '—'}
                                </Typography>
                            </Box>

                            <Box sx={{flex: 1, minWidth: 260}}>
                                {isMeasured ? (
                                    <>
                                        <Typography variant="body2">
                                            {t('refValue')}: {proto.refValue ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMin')}: {proto.minTolerance ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMax')}: {proto.maxTolerance ?? '—'}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{mt: 1}}>
                                            <TextField
                                                label={t('assessedValue')}
                                                value={assessedValue}
                                                onChange={(e) =>
                                                    onAssessmentChange(
                                                        index,
                                                        'assessedValue',
                                                        filterDecimalNumericInput(e.target.value),
                                                    )
                                                }
                                                size="small"
                                                fullWidth
                                                inputProps={{inputMode: 'decimal'}}
                                                sx={{flex: 1, minWidth: 0}}
                                            />
                                            {rangeHint === 'in' ? (
                                                <Tooltip title={t('measuredValueInTolerance')}>
                                                    <CheckCircleIcon
                                                        color="success"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueInTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : rangeHint === 'out' ? (
                                                <Tooltip title={t('measuredValueOutOfTolerance')}>
                                                    <CancelIcon
                                                        color="error"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueOutOfTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : null}
                                        </Stack>
                                    </>
                                ) : isAttributive ? (
                                    <FormControl sx={{mt: 0.5}} component="fieldset" variant="standard">
                                        <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                        <RadioGroup
                                            row
                                            value={assessedValueGood ? 'ok' : 'nok'}
                                            onChange={(e) =>
                                                onAssessmentChange(
                                                    index,
                                                    'assessedValueGood',
                                                    e.target.value === 'ok',
                                                )
                                            }
                                        >
                                            <FormControlLabel
                                                value="ok"
                                                control={<Radio size="small" />}
                                                label={t('ok')}
                                            />
                                            <FormControlLabel
                                                value="nok"
                                                control={<Radio size="small" />}
                                                label={t('nok')}
                                            />
                                        </RadioGroup>
                                    </FormControl>
                                ) : (
                                    <>
                                        <Typography variant="body2">
                                            {t('toleranceMin')}: {proto.minTolerance ?? '—'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('toleranceMax')}: {proto.maxTolerance ?? '—'}
                                        </Typography>
                                        <FormControlLabel
                                            sx={{mt: 0.5}}
                                            control={
                                                <Checkbox
                                                    checked={assessedValueGood}
                                                    onChange={(e) =>
                                                        onAssessmentChange(
                                                            index,
                                                            'assessedValueGood',
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                            }
                                            label={t('assessedValueGood')}
                                        />
                                    </>
                                )}
                            </Box>
                        </Stack>

                        <Box sx={{mt: 1}}>
                            <Typography variant="body2" color="text.secondary">
                                {t('description')}: {proto.description ?? '—'}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
}

export function ControlProductModalBody({
    hint,
    prototypes,
    assessments,
    onAssessmentChange,
    technicalDrawingBase64,
}: {
    hint?: ReactNode;
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean,
    ) => void;
    technicalDrawingBase64?: string;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: {xs: 'column', md: 'row'},
                gap: 2,
                alignItems: 'flex-start',
                minHeight: {md: 'min(68vh, 600px)'},
            }}
        >
            <Box sx={{flex: {md: '1 1 75%'}, minWidth: 0, width: {xs: '100%', md: '75%'}}}>
                {hint}
                <MeasuringFeaturesForm
                    prototypes={prototypes}
                    assessments={assessments}
                    onAssessmentChange={onAssessmentChange}
                />
            </Box>
            <Box
                sx={{
                    flex: {md: '0 0 25%'},
                    width: {xs: '100%', md: '25%'},
                    maxWidth: {xs: '100%', md: '25%'},
                    alignSelf: 'stretch',
                }}
            >
                <TechnicalDrawingColumn base64={technicalDrawingBase64} />
            </Box>
        </Box>
    );
}
