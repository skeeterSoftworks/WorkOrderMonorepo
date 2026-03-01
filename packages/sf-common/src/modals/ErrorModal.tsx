import Container from '@mui/material/Container';
import { Button, Dialog, DialogContent, DialogTitle, Grid } from '@mui/material';

import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import React from 'react';
import {centerHorizontal} from "../styling/Custom";
import {closeErrorModal} from "../actions/Actions";

interface Props {
    onModalClose?: any,
}

export function ErrorModal(props: Props) {

    const modalOpen: boolean = useSelector((state: any) => state.applicationStore.errorModalOpen) || false;

    const errorModalMessage: string = useSelector((state: any) => state.applicationStore.errorModalMessage);

    const dispatch = useDispatch()
	const { t } = useTranslation();

    function handleModalClose() {

        dispatch(closeErrorModal())
        props.onModalClose && props.onModalClose()
    }


    return (
        <Dialog open={modalOpen} fullWidth maxWidth="md">
            <DialogTitle style={{ marginBottom: 20, color: "white", textAlign: "center", backgroundColor: "red" }}>
                {t("error")}
            </DialogTitle>

            <DialogContent>
                <Container maxWidth="md" style={{ ...centerHorizontal, marginTop: 20 }}>
                    <Grid item sm={6}>
                        <Grid>
                            {errorModalMessage}
                        </Grid>
                        <Button variant="text" type="button" onClick={handleModalClose}>
                        {t("closeAction")}
                        </Button>
                    </Grid>

                </Container>
            </DialogContent>
        </Dialog>
    );
}


