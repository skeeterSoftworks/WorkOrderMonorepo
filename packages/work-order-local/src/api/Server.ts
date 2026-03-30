import type {
    ApplicationUserTO,
    BoundMachineProductTO,
    QualityInfoStepTO,
    StationConfigDTO,
    WorkstationMachineConfigTO,
    WorkSessionControlProductCreateTO,
    WorkSessionFaultyProductCreateTO,
    WorkSessionGoodDeltaTO,
    WorkSessionOpenRequestTO,
    WorkSessionResponseTO,
    WorkSessionSetupProductCreateTO,
} from "../models/ApiRequests";
import type { SelectOptionsTO } from "sf-common/src/models/ApiRequests";
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

    /**
     * Station config from local server, including work-station preconditions JSON
     * (local proxies to central {@code /config/get-wo-preconditions}).
     */
    static fetchStationConfigWithPreconditions(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/config/station-config`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getWorkstationMachine(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/config/workstation-machine`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static saveWorkstationMachine(config: WorkstationMachineConfigTO, onSuccess: Function, onError?: Function) {
        axios.post(`${getServerUrl()}/config/workstation-machine`, config)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getSelectOptions(onSuccess: Function, onError?: Function) {
        axios.get<SelectOptionsTO>(`${getServerUrl()}/config/select-options`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getMachinesFromCentralViaLocal(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/machines/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    /** Work orders with non-cancelled bookings on the workstation's bound machine (local → central). */
    static getProductionWorkOrdersForBoundMachine(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/production/work-orders`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static async getProductionWorkOrderQualityInfoSteps(workOrderId: number): Promise<QualityInfoStepTO[]> {
        const r = await axios.get<QualityInfoStepTO[]>(
            `${getServerUrl()}/production/work-orders/${workOrderId}/quality-info-steps`,
        );
        return Array.isArray(r.data) ? r.data : [];
    }

    static async getBoundMachineProducts(): Promise<BoundMachineProductTO[]> {
        const r = await axios.get<BoundMachineProductTO[]>(`${getServerUrl()}/production/bound-machine/products`);
        return Array.isArray(r.data) ? r.data : [];
    }

    static async putBoundMachineProductQualityInfoSteps(
        productId: number,
        steps: QualityInfoStepTO[],
    ): Promise<BoundMachineProductTO> {
        const r = await axios.put<BoundMachineProductTO>(
            `${getServerUrl()}/production/bound-machine/products/${productId}/quality-info-steps`,
            steps,
        );
        return r.data;
    }

    static async openProductionWorkSession(body: WorkSessionOpenRequestTO): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(`${getServerUrl()}/production/work-sessions/open`, body);
        return r.data;
    }

    static async endProductionWorkSession(sessionId: number): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(`${getServerUrl()}/production/work-sessions/${sessionId}/end`);
        return r.data;
    }

    /** Records good count and flushes to central; response body is the updated work session. */
    static async postProductionGoodDelta(sessionId: number, body: WorkSessionGoodDeltaTO): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(
            `${getServerUrl()}/production/work-sessions/${sessionId}/good-delta`,
            body
        );
        return r.data;
    }

    static async postProductionControlProduct(sessionId: number, body: WorkSessionControlProductCreateTO): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(
            `${getServerUrl()}/production/work-sessions/${sessionId}/control-products`,
            body
        );
        return r.data;
    }

    static async postProductionFaultyProduct(sessionId: number, body: WorkSessionFaultyProductCreateTO): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(
            `${getServerUrl()}/production/work-sessions/${sessionId}/faulty-products`,
            body
        );
        return r.data;
    }

    /** Records one setup event (e.g. tool change) for the session; optional measurements forwarded to central. */
    static async postProductionSetupProduct(
        sessionId: number,
        body?: WorkSessionSetupProductCreateTO | null,
    ): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(
            `${getServerUrl()}/production/work-sessions/${sessionId}/setup-products`,
            body ?? undefined,
        );
        return r.data;
    }

    static async getProductionWorkSession(sessionId: number): Promise<WorkSessionResponseTO> {
        const r = await axios.get<WorkSessionResponseTO>(`${getServerUrl()}/production/work-sessions/${sessionId}`);
        return r.data;
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
