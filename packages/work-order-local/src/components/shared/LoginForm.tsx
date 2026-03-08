import { Button, Paper } from '@mui/material'
import { useEffect } from 'react';
import { Form, Field } from 'react-final-form'
import { useDispatch, useSelector } from 'react-redux';
import { openErrorModal } from '../../actions/Actions';
import type { QRData } from '../../models/ApiRequests';
import { paddedContainer } from '../../styling/Custom';
import { Server } from '../../api/Server';
import { useTranslation } from 'react-i18next';
import {useNavigate} from "react-router";


export function LoginForm() {

    const scannedQrData: QRData | undefined = useSelector((state: any) => state.applicationStore.QRData);

    const { t } = useTranslation()

    const dispatch = useDispatch();

    const navigation = useNavigate();

    const handleGetUserByQRResponse = (response) => {

        if (response.data.responseStatus === "ERROR") {

            if (response.data.data === "NOT_FOUND") {
                dispatch(openErrorModal(t("msg_userWithScannedQrNotExist")));
            } else {
                dispatch(openErrorModal(t("msg_errorSearchingUser")));
            }

        } else {
            sessionStorage.setItem("userData", JSON.stringify(response.data));
            console.log("User data stored in sessionStorage: ", response);
            navigation("/")
        }
    }

    useEffect(() => {

        if (scannedQrData?.qrText) {

            Server.fetchOperatorData(scannedQrData?.qrText, (response) => { handleGetUserByQRResponse(response) },
                (error) => {
                    dispatch(openErrorModal(t("msg_errorFetchingOperatorData") + " " + error))
                })
        }

    }, [scannedQrData]);




    const submitLogin = (formValues) => {

        if (!formValues || !formValues.userID) {
            dispatch(openErrorModal(t("typeUserIdOrScanPersonalQr")))
        } else {
            Server.fetchOperatorData(formValues.userID, (response) => { handleGetUserByQRResponse(response) },
                (error) => {
                    dispatch(openErrorModal(t("msg_errorFetchingOperatorData") + " " + error))
                })
        }
    }

    return (
        <Form
            onSubmit={submitLogin}
            render={({ handleSubmit }) => (
                <Paper style={paddedContainer}>

                    <div style={{ textAlign: "center" }}>

                        <form onSubmit={handleSubmit}>
                            <h2>Login</h2>
                            <div style={{ textAlign: "center", marginBottom: "5vh" }}>
                                <label style={{ marginRight: "3vh" }}>{t("enterOrScanQR")}</label>
                                <Field name="userID" component="input" />
                            </div>
                            <Button variant="contained" type='submit'>{t("loginButton")}</Button>
                        </form>
                    </div>
                </Paper>
            )}
        />
    )
}
