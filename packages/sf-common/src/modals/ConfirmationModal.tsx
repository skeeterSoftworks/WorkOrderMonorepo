import Container from '@mui/material/Container';
import { Button, Dialog, DialogContent, DialogTitle, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {centerHorizontal} from "../styling/Custom";
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
        <Dialog open={props.open || false}>
            <DialogTitle style={{ marginBottom: 20, color: "white", textAlign: "center", backgroundColor: "red" }}>
                {t("confirmSelectedAction")}
            </DialogTitle>

            <DialogContent>
                <Container style={{ ...centerHorizontal, marginTop: 20, width: 400 }}>
                    <Grid item sm={6}>
                        <Grid sx={{ height: 80 }}>
                            {props.modalMessage}
                        </Grid>
                        <Grid container spacing={1} justifyContent="center">
                            <Grid item>
                                <Button variant="contained" type="button" color="success" onClick={() => { props.onConfirm && props.onConfirm() }}>
                                {t("confirmAction")}
                                </Button>
                            </Grid>
                            <Grid item>

                                <Button variant="contained" color="error" type="button" onClick={handleModalClose}>
                                {t("cancelAction")}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>

                </Container>
            </DialogContent>
        </Dialog>
    );
}


