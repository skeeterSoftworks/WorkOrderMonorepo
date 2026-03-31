import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';
import type {QualityInfoStepTO} from '../models/ApiRequests';
import {isPdfDataUrl, normalizeBinaryDataUrl} from 'sf-common/src/util/mediaDataUrl';

export type QualityInfoReviewDialogProps = {
    open: boolean;
    steps: QualityInfoStepTO[];
    stepIndex: number;
    openingSession: boolean;
    onAbortSession: () => void;
    onStepChange: (nextIndex: number) => void;
    onStartProduction: () => void;
};

export function QualityInfoReviewDialog({
    open,
    steps,
    stepIndex,
    openingSession,
    onAbortSession,
    onStepChange,
    onStartProduction,
}: QualityInfoReviewDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} fullWidth maxWidth="md" disableEscapeKeyDown onClose={() => {}}>
            <DialogTitle>{t('qualityInfoReviewTitle')}</DialogTitle>
            <DialogContent>
                {steps.length > 0 && (
                    <Stack spacing={2} sx={{mt: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            {t('qualityInfoStepOf', {
                                current: stepIndex + 1,
                                total: steps.length,
                            })}
                        </Typography>
                        {(() => {
                            const step = steps[stepIndex];
                            const src = normalizeBinaryDataUrl(step?.imageDataBase64, 'image/png');
                            return (
                                <>
                                    {src ? (
                                        isPdfDataUrl(src) ? (
                                            <Box
                                                component="iframe"
                                                src={src}
                                                title=""
                                                sx={{
                                                    width: '100%',
                                                    maxHeight: 360,
                                                    minHeight: 280,
                                                    border: 'none',
                                                    borderRadius: 1,
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                component="img"
                                                src={src}
                                                alt=""
                                                sx={{
                                                    width: '100%',
                                                    maxHeight: 360,
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        )
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('qualityInfoNoImage')}
                                        </Typography>
                                    )}
                                    <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>
                                        {step?.stepDescription?.trim() ? step.stepDescription : '—'}
                                    </Typography>
                                </>
                            );
                        })()}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{flexWrap: 'wrap', gap: 1, px: 2, pb: 2}}>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={onAbortSession}
                    disabled={openingSession}
                    startIcon={<CloseIcon />}
                >
                    {t('workSessionAbortSession')}
                </Button>
                <Box sx={{flexGrow: 1}} />
                {stepIndex > 0 && (
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => onStepChange(stepIndex - 1)}
                        disabled={openingSession}
                        startIcon={<KeyboardDoubleArrowLeftIcon />}
                    >
                        {t('previous')}
                    </Button>
                )}
                {stepIndex < steps.length - 1 && (
                    <Button
                        variant="contained"
                        onClick={() => onStepChange(stepIndex + 1)}
                        disabled={openingSession}
                        endIcon={<KeyboardDoubleArrowRightIcon />}
                    >
                        {t('next')}
                    </Button>
                )}
                {stepIndex === steps.length - 1 && steps.length > 0 && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onStartProduction}
                        disabled={openingSession}
                    >
                        {t('startProduction')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
