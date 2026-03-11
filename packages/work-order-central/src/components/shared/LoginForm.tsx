import { Button, Paper } from '@mui/material'
import { useEffect } from 'react';
import { Form, Field } from 'react-final-form'
import { useDispatch, useSelector } from 'react-redux';
import { openErrorModal } from '../../actions/Actions';
import type { QRData } from '../../models/ApiRequests';
import { paddedContainer } from '../../styling/Custom';
import { Server } from '../../api/Server';
import { useTranslation } from 'react-i18next';
import {useNavigate} from "react-router-dom";


export function LoginForm() {

    const scannedQrData: QRData | undefined = useSelector((state: any) => state.applicationStore.QRData);

    const { t } = useTranslation()

    const dispatch = useDispatch();

    const navigation = useNavigate();

    const handleGetUserByQRResponse = (response: any) => {

        // handle response from server and notify app about login
        if (response.status !== 200) {

            if (response.data === "NOT_FOUND") {
                dispatch(openErrorModal(t("msg_userWithScannedQrNotExist")));
            } else {
                dispatch(openErrorModal(t("msg_errorSearchingUser")));
            }

        } else {
            sessionStorage.setItem("userData", JSON.stringify(response.data));
            console.log("User data stored in sessionStorage: ", response.data);
            // Notify other parts of the app that a user has logged in and navigate to home
            try {
                window.dispatchEvent(new Event('userLoggedIn'));
            } catch (e) {
                /* ignore */
            }
            navigation("/")
        }
    }

    useEffect(() => {

        if (scannedQrData?.qrText) {

            Server.fetchOperatorData(scannedQrData?.qrText, (response:any) => { handleGetUserByQRResponse(response) },
                (error: any) => {
                    dispatch(openErrorModal(t("msg_errorFetchingOperatorData") + " " + error))
                })
        }

    }, [scannedQrData]);




    const submitLogin = (formValues: any) => {

        if (!formValues || !formValues.userID) {
            dispatch(openErrorModal(t("typeUserIdOrScanPersonalQr")))
        } else {
            Server.fetchOperatorData(formValues.userID, (response: any) => { handleGetUserByQRResponse(response) },
                (error: any) => {
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
