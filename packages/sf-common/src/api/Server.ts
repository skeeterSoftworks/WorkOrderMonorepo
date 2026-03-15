import type {ApplicationUserTO, StationConfigDTO, PurchaseOrderTO, ProductTO} from "../models/ApiRequests";
import axios from "axios";
import { getServerUrl } from "../util/EnvUtils";


export class Server {

    static fetchOperatorData(scannedQr: string, onSuccess: Function, onError?: Function) {

        axios.get(`${getServerUrl()}/users/${scannedQr}`)
            .then(response => onSuccess(response))
            .catch(
                (error) => {
                    onError && onError(error)
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
            .catch(error => console.log(error));

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

    static deleteUser(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/users/${id}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static getAllPurchaseOrders(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/purchaseorder/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addPurchaseOrder(purchaseOrder: PurchaseOrderTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/purchaseorder/add`, purchaseOrder)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static editPurchaseOrder(purchaseOrder: PurchaseOrderTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/purchaseorder/update`, purchaseOrder)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static deletePurchaseOrder(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/purchaseorder/${id}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static getAllProducts(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/products/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addProduct(product: ProductTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/products/add`, product)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static editProduct(product: ProductTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/products/update`, product)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static deleteProduct(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/products/${id}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
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
            .then(response => {

            })
            .catch(error => {
                console.error(error)
                onError(error)
            });
    }
}
