import axios from "axios";

import {FetchParams, ProductProfileTO, ProductsFetchParams} from "../models/ApiRequests";
import {getServerUrl} from "../util/EnvUtils";
import {composeGetParams} from "../util/ApiUtils";


export class Products {

    static fetchProductData(productQr: string, onSuccess: Function, onError: Function) {

        axios.get(`${getServerUrl()}/products/find_by_qr?qrCode=${productQr}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error)
                onError(error)
            });
    }


    static getAllProducts(params: ProductsFetchParams, onSuccess: Function, onError: Function) {

        const getParams: string = composeGetParams(params);

        axios.get(`${getServerUrl()}/products/all?${getParams}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error)
            });
    }

    static fetchAllProductProfiles(fetchParams: FetchParams, onSuccess: Function, onError: Function) {

        axios.get(`${getServerUrl()}/product_profiles?${composeGetParams(fetchParams)}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error)
                onError(error)
            });
    }


    static fetchProductProfileData(referenceNumber: string, includeFinalInspectionData: boolean,  onSuccess: Function, onError: Function) {

        axios.get(`${getServerUrl()}/product_profiles/find_by_reference_number?includeFinalInspectionSteps=${includeFinalInspectionData}&referenceNumber=${referenceNumber}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error)
                onError(error)
            });
    }

    static addNewProductProfile(productProfile: ProductProfileTO, onSuccess: Function, onError: Function) {

        axios.post(`${getServerUrl()}/product_profiles`, productProfile)
            .then(response => {
                onSuccess(response)
            })
            .catch(error => {
                console.log(error)
                onError && onError(error)
            });
    }


    static deleteProductProfile(referenceID: string, onSuccess: Function, onError: Function) {

        axios.get(`${getServerUrl()}/product_profiles/delete?referenceID=` + referenceID)
            .then(response => {
                onSuccess(response)
            })
            .catch(error => {
                console.log(error)
                onError && onError(error)
            });
    }
}
