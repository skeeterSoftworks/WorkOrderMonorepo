import type {ApplicationUserTO, StationConfigDTO} from "../models/ApiRequests";
import axios from "axios";
import {getServerUrl} from "../util/EnvUtils";


export class Server {

    static fetchOperatorData(scannedQr: string, onSuccess: Function, onError?: Function) {

        axios.get(`${getServerUrl()}/users/${scannedQr}`)
            .then(response => onSuccess(response))
            .catch(
                (error) => {
                    onError &&  onError(error)
                    console.log(error)
                });

    }

    static addUser(applicationUserTO: ApplicationUserTO, onSuccess: Function, onError?: Function) {

        axios.post(`${getServerUrl()}/users/add`, applicationUserTO)
            .then(response => {
                onSuccess(response)
            })
            .catch(error => {
                console.log(error)
                onError && onError(error)
            });
    }

    static editUser(applicationUserTO: ApplicationUserTO, onSuccess: Function, onError?: Function) {

        axios.post(`${getServerUrl()}/users/update`, applicationUserTO)
            .then(response => {
                onSuccess(response)
            })
            .catch(error => {
                console.log(error)
                onError && onError(error)
            });
    }


    static fetchStationConfig(onSuccess: Function, onError?: Function) {

        axios.get(`${getServerUrl()}/configuration/get_station_config`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error)
                onError && onError(error)
            });

    }

    static updateStationConfig(stationConfigDTO: StationConfigDTO, onSuccess: Function, onError?: Function) {
        axios.post(`${getServerUrl()}/configuration/update_station_config`, stationConfigDTO)
            .then(response => {
                onSuccess(response)
            })
            .catch(error => {
                onError && onError(error)
            });
    }

    static getAllUsers(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/users/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error)
            });
    }

    static getCustomQrCode(customQr: string, onSuccess: Function) {
        axios.get(`${getServerUrl()}/qrcode/generate?qrData=${customQr}`)
            .then(response => {
                if (response?.data?.data != null) {
                    onSuccess(response.data.data)
                }
            })
            .catch(error => console.log(error));
    }

    static sendMockQr(mockQrCode: any, onError: Function) {

        axios.post(`${getServerUrl()}/qrcode/simulate`, mockQrCode)
            .then(() => {

            })
            .catch(error => {
                console.error(error)
                onError && onError(error)
            });
    }

    static getProductBySicDataMatrix(sicDataMatrix: string, onSuccess: Function, onError: Function) {

        axios.get(`${getServerUrl()}/qr_messages/find_by_sic_dmc?sicDmc=${sicDataMatrix}`)
            .then(response => {

                if (response?.data?.responseStatus === "ERROR") {
                    onError(response?.data.errorMessage)
                } else {
                    onSuccess(response.data.data)

                }
            })
            .catch(error => {
                console.error(error)
                onError(error)
            });
    }
}
