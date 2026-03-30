import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import {useTranslation} from 'react-i18next';
import type {MeasuringFeaturePrototypeTO, WorkSessionMeasuringFeatureInputTO} from '../models/ApiRequests';
import {controlProductDialogPaperSx} from './workSessionDialogStyles';
import {ControlProductModalBody} from './ControlProductModalBody';

export type InitialControlProductDialogProps = {
    open: boolean;
    submitting: boolean;
    initialControlAssessmentsComplete: boolean;
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
            <DialogTitle>{t('workSessionMandatoryFirstControl')}</DialogTitle>
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
            <DialogActions>
                <Button onClick={onAbortSession} color="inherit" disabled={submitting}>
                    {t('workSessionAbortSession')}
                </Button>
                <Button onClick={onSave} variant="contained" disabled={submitting || !initialControlAssessmentsComplete}>
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
