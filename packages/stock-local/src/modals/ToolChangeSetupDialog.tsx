import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {useTranslation} from 'react-i18next';
import type {SetupDataPrototypeTO} from '../models/ApiRequests';
import {filterDecimalNumericInput} from '../util/decimalNumericInput';
import {setupProductDialogTitleSx} from './workSessionDialogStyles';

function formatSetupProtoNumber(n: number | undefined | null): string {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return String(n);
}

export type ToolChangeSetupDialogProps = {
    open: boolean;
    onClose: () => void;
    submitting: boolean;
    setupModalLoading: boolean;
    setupModalProto: SetupDataPrototypeTO | null;
    setupHeightMeasured: string;
    onSetupHeightMeasuredChange: (v: string) => void;
    setupHeightOkNok: 'ok' | 'nok';
    onSetupHeightOkNokChange: (v: 'ok' | 'nok') => void;
    setupDiamMeasured: string;
    onSetupDiamMeasuredChange: (v: string) => void;
    setupDiamOkNok: 'ok' | 'nok';
    onSetupDiamOkNokChange: (v: 'ok' | 'nok') => void;
    setupMeasuredHeightRangeHint: 'in' | 'out' | 'none';
    setupMeasuredDiameterRangeHint: 'in' | 'out' | 'none';
    onRecordSetup: () => void;
};

export function ToolChangeSetupDialog({
    open,
    onClose,
    submitting,
    setupModalLoading,
    setupModalProto,
    setupHeightMeasured,
    onSetupHeightMeasuredChange,
    setupHeightOkNok,
    onSetupHeightOkNokChange,
    setupDiamMeasured,
    onSetupDiamMeasuredChange,
    setupDiamOkNok,
    onSetupDiamOkNokChange,
    setupMeasuredHeightRangeHint,
    setupMeasuredDiameterRangeHint,
    onRecordSetup,
}: ToolChangeSetupDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog
            open={open}
            onClose={() => !submitting && onClose()}
            fullWidth
            maxWidth="md"
            scroll="paper"
        >
            <DialogTitle sx={setupProductDialogTitleSx}>{t('workSessionToolChange')}</DialogTitle>
            <DialogContent dividers sx={{overflow: 'auto'}}>
                {setupModalLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{py: 2}}>
                        <CircularProgress size={22} />
                        <Typography variant="body2" color="text.secondary">
                            {t('workSessionSetupLoading')}
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={2} sx={{mt: 0.5}}>
                        <Typography variant="body2" color="text.secondary">
                            {t('workSessionSetupFormHint')}
                        </Typography>
                        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="flex-start">
                            <Box sx={{flex: 1, minWidth: {md: 160}}}>
                                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                    {t('operation')}
                                </Typography>
                                <Typography variant="body2">{setupModalProto?.operationID?.trim() || '—'}</Typography>
                                <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{mt: 1.5}}>
                                    {t('workSessionSetupToolId')}
                                </Typography>
                                <Typography variant="body2">{setupModalProto?.toolID?.trim() || '—'}</Typography>
                            </Box>

                            <Box sx={{flex: 1, minWidth: 0, width: '100%'}}>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('heightMeasurement')}
                                </Typography>
                                {!setupModalProto ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {t('workSessionSetupNoPrototype')}
                                    </Typography>
                                ) : setupModalProto.attributiveHeightMeasurement ? (
                                    <FormControl component="fieldset" variant="standard" sx={{mt: 0.5}}>
                                        <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                        <RadioGroup
                                            row
                                            value={setupHeightOkNok}
                                            onChange={(e) =>
                                                onSetupHeightOkNokChange(e.target.value === 'ok' ? 'ok' : 'nok')
                                            }
                                        >
                                            <FormControlLabel value="ok" control={<Radio size="small" />} label={t('ok')} />
                                            <FormControlLabel value="nok" control={<Radio size="small" />} label={t('nok')} />
                                        </RadioGroup>
                                    </FormControl>
                                ) : (
                                    <Stack spacing={1} sx={{mt: 0.5}}>
                                        <Typography variant="body2">
                                            {t('refHeight')}: {formatSetupProtoNumber(setupModalProto.heightRefValue)}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('heightMaxNegTolerance')}:{' '}
                                            {formatSetupProtoNumber(setupModalProto.heightMaxNegTolerance)}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('heightMaxPosTolerance')}:{' '}
                                            {formatSetupProtoNumber(setupModalProto.heightMaxPosTolerance)}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <TextField
                                                label={t('workSessionSetupMeasuredValue')}
                                                value={setupHeightMeasured}
                                                onChange={(e) =>
                                                    onSetupHeightMeasuredChange(filterDecimalNumericInput(e.target.value))
                                                }
                                                size="small"
                                                fullWidth
                                                inputProps={{inputMode: 'decimal'}}
                                                sx={{flex: 1, minWidth: 0}}
                                            />
                                            {setupMeasuredHeightRangeHint === 'in' ? (
                                                <Tooltip title={t('measuredValueInTolerance')}>
                                                    <CheckCircleIcon
                                                        color="success"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueInTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : setupMeasuredHeightRangeHint === 'out' ? (
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
                                    </Stack>
                                )}
                            </Box>

                            <Box sx={{flex: 1, minWidth: 0, width: '100%'}}>
                                <Typography variant="subtitle2" gutterBottom>
                                    {t('diameterMeasurement')}
                                </Typography>
                                {!setupModalProto ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {t('workSessionSetupNoPrototype')}
                                    </Typography>
                                ) : setupModalProto.attributiveDiameterMeasurement ? (
                                    <FormControl component="fieldset" variant="standard" sx={{mt: 0.5}}>
                                        <FormLabel component="legend">{t('okNokChoice')}</FormLabel>
                                        <RadioGroup
                                            row
                                            value={setupDiamOkNok}
                                            onChange={(e) =>
                                                onSetupDiamOkNokChange(e.target.value === 'ok' ? 'ok' : 'nok')
                                            }
                                        >
                                            <FormControlLabel value="ok" control={<Radio size="small" />} label={t('ok')} />
                                            <FormControlLabel value="nok" control={<Radio size="small" />} label={t('nok')} />
                                        </RadioGroup>
                                    </FormControl>
                                ) : (
                                    <Stack spacing={1} sx={{mt: 0.5}}>
                                        <Typography variant="body2">
                                            {t('refDiameter')}: {formatSetupProtoNumber(setupModalProto.diameterRefValue)}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('diameterMaxNegTolerance')}:{' '}
                                            {formatSetupProtoNumber(setupModalProto.diameterMaxNegTolerance)}
                                        </Typography>
                                        <Typography variant="body2">
                                            {t('diameterMaxPosTolerance')}:{' '}
                                            {formatSetupProtoNumber(setupModalProto.diameterMaxPosTolerance)}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <TextField
                                                label={t('workSessionSetupMeasuredValue')}
                                                value={setupDiamMeasured}
                                                onChange={(e) =>
                                                    onSetupDiamMeasuredChange(filterDecimalNumericInput(e.target.value))
                                                }
                                                size="small"
                                                fullWidth
                                                inputProps={{inputMode: 'decimal'}}
                                                sx={{flex: 1, minWidth: 0}}
                                            />
                                            {setupMeasuredDiameterRangeHint === 'in' ? (
                                                <Tooltip title={t('measuredValueInTolerance')}>
                                                    <CheckCircleIcon
                                                        color="success"
                                                        fontSize="medium"
                                                        sx={{flexShrink: 0}}
                                                        aria-label={t('measuredValueInTolerance')}
                                                    />
                                                </Tooltip>
                                            ) : setupMeasuredDiameterRangeHint === 'out' ? (
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
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    {t('cancel')}
                </Button>
                <Button onClick={onRecordSetup} variant="contained" disabled={submitting || setupModalLoading}>
                    {t('workSessionRecordSetup')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
