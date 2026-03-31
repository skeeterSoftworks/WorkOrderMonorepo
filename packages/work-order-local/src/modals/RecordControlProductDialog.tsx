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

export type RecordControlProductDialogProps = {
    open: boolean;
    submitting: boolean;
    recordControlAssessmentsComplete: boolean;
    showFaultyProductWarning: boolean;
    prototypes: MeasuringFeaturePrototypeTO[];
    assessments: WorkSessionMeasuringFeatureInputTO[];
    technicalDrawingBase64?: string;
    onAssessmentChange: (
        index: number,
        field: keyof WorkSessionMeasuringFeatureInputTO,
        value: string | boolean,
    ) => void;
    onEscapeOrBackdrop: (reason: 'backdropClick' | 'escapeKeyDown') => void;
    onCancel: () => void;
    onSave: () => void;
};

export function RecordControlProductDialog({
    open,
    submitting,
    recordControlAssessmentsComplete,
    showFaultyProductWarning,
    prototypes,
    assessments,
    technicalDrawingBase64,
    onAssessmentChange,
    onEscapeOrBackdrop,
    onCancel,
    onSave,
}: RecordControlProductDialogProps) {
    const {t} = useTranslation();
    return (
        <Dialog
            open={open}
            onClose={(_, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    onEscapeOrBackdrop(reason);
                }
            }}
            disableEscapeKeyDown={!recordControlAssessmentsComplete}
            fullWidth
            maxWidth={false}
            PaperProps={{sx: controlProductDialogPaperSx}}
        >
            <DialogTitle sx={controlProductDialogTitleSx}>{t('workSessionRecordControl')}</DialogTitle>
            <DialogContent dividers sx={{overflow: 'auto'}}>
                <ControlProductModalBody
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
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={onCancel}
                            disabled={submitting || !recordControlAssessmentsComplete}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            onClick={onSave}
                            variant="contained"
                            color={showFaultyProductWarning ? 'error' : 'primary'}
                            disabled={submitting || !recordControlAssessmentsComplete}
                        >
                            {showFaultyProductWarning ? t('workSessionDeclareAsFaulty') : t('save')}
                        </Button>
                    </Stack>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
