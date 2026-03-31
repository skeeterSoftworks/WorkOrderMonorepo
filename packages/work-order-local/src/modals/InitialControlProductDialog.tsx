import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import {useTranslation} from 'react-i18next';
import type {MeasuringFeaturePrototypeTO, WorkSessionMeasuringFeatureInputTO} from '../models/ApiRequests';
import {controlProductDialogPaperSx, controlProductDialogTitleSx} from './workSessionDialogStyles';
import {ControlProductModalBody} from './ControlProductModalBody';

export type InitialControlProductDialogProps = {
    open: boolean;
    submitting: boolean;
    initialControlAssessmentsComplete: boolean;
    /** When assessments are complete but any measure is NOK / out of tolerance. */
    showFaultyProductWarning: boolean;
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    technicalDrawingBase64?: string;
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean,
    ) => void;
    onAbortSession: () => void;
    onSave: () => void;
};

export function InitialControlProductDialog({
    open,
    submitting,
    initialControlAssessmentsComplete,
    showFaultyProductWarning,
    prototypes,
    assessments,
    technicalDrawingBase64,
    onAssessmentChange,
    onAbortSession,
    onSave,
}: InitialControlProductDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} fullWidth maxWidth={false} disableEscapeKeyDown PaperProps={{sx: controlProductDialogPaperSx}}>
            <DialogTitle sx={controlProductDialogTitleSx}>{t('workSessionMandatoryFirstControl')}</DialogTitle>
            <DialogContent dividers sx={{overflow: 'auto'}}>
                <ControlProductModalBody
                    hint={
                        <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                            {t('workSessionMandatoryFirstControlHint')}
                        </Typography>
                    }
                    prototypes={prototypes}
                    assessments={assessments}
                    onAssessmentChange={onAssessmentChange}
                    technicalDrawingBase64={technicalDrawingBase64}
                />
            </DialogContent>
            <DialogActions sx={{display: 'block', px: 3, pb: 2, pt: 1}}>
                <Stack spacing={1.5}>
                    {showFaultyProductWarning ? (
                        <Typography variant="body2" color="error" sx={{fontWeight: 600}}>
                            {t('workSessionControlProductFaultyWarning')}
                        </Typography>
                    ) : null}
                    <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button onClick={onAbortSession} color="inherit" disabled={submitting}>
                            {t('workSessionAbortSession')}
                        </Button>
                        <Button
                            onClick={onSave}
                            variant="contained"
                            color={showFaultyProductWarning ? 'error' : 'primary'}
                            disabled={submitting || !initialControlAssessmentsComplete}
                        >
                            {showFaultyProductWarning ? t('workSessionDeclareAsFaulty') : t('save')}
                        </Button>
                    </Stack>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
