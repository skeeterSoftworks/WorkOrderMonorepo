import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import React from 'react';

interface Props {
    onModalClose?: Function,
    onConfirm: Function,
    open?: boolean,
    modalMessage: string
}

export function ConfirmationModal(props: Props) {

    const { t } = useTranslation();

    function handleModalClose() {
        props.onModalClose && props.onModalClose()
    }


    return (
        <Dialog
            open={props.open || false}
            onClose={handleModalClose}
            fullWidth
            maxWidth="sm"
            scroll="paper"
        >
            <DialogTitle
                sx={{
                    color: 'common.white',
                    textAlign: 'center',
                    bgcolor: 'error.main',
                    py: 1.5,
                }}
            >
                {t("confirmSelectedAction")}
            </DialogTitle>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    pt: 2,
                    pb: 2,
                    minWidth: 0,
                    overflow: 'hidden',
                }}
            >
                <DialogContentText
                    component="div"
                    sx={{
                        m: 0,
                        maxHeight: { xs: 'min(42vh, 280px)', sm: 'min(50vh, 360px)' },
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        pr: 0.5,
                    }}
                >
                    {props.modalMessage}
                </DialogContentText>

                <Stack
                    direction={{ xs: 'column-reverse', sm: 'row' }}
                    spacing={1}
                    justifyContent="center"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ flexShrink: 0, pt: 0.5 }}
                >
                    <Button
                        variant="contained"
                        color="error"
                        type="button"
                        onClick={handleModalClose}
                        sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
                    >
                        {t("cancelAction")}
                    </Button>
                    <Button
                        variant="contained"
                        type="button"
                        color="success"
                        onClick={() => { props.onConfirm && props.onConfirm() }}
                        sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
                    >
                        {t("confirmAction")}
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}


