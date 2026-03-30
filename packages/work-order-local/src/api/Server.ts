import type {
    BoundMachineProductTO,
    QualityInfoStepTO,
    WorkSessionControlProductCreateTO,
    WorkSessionFaultyProductCreateTO,
    WorkSessionGoodDeltaTO,
    WorkSessionOpenRequestTO,
    WorkSessionResponseTO,
    WorkSessionSetupProductCreateTO,
    WorkstationMachineConfigTO,
} from "../models/ApiRequests";
import type {SelectOptionsTO} from "sf-common/src/models/ApiRequests";
import axios from "axios";
import toast from "react-hot-toast";
import i18n from "../i18n/I18n";
import {getServerUrl} from "../util/EnvUtils";


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
            .then((response) => {
                toast.success(i18n.t("workstationMachineSaved"));
                onSuccess(response);
            })
            .catch((error) => {
                console.log(error);
                toast.error(i18n.t("saveWorkstationMachineError"));
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
        try {
            const r = await axios.put<BoundMachineProductTO>(
                `${getServerUrl()}/production/bound-machine/products/${productId}/quality-info-steps`,
                steps,
            );
            toast.success(i18n.t("qualityInfoStepsSaveOk"));
            return r.data;
        } catch (e) {
            console.log(e);
            toast.error(i18n.t("qualityInfoStepsSaveError"));
            throw e;
        }
    }

    static async openProductionWorkSession(body: WorkSessionOpenRequestTO): Promise<WorkSessionResponseTO> {
        const r = await axios.post<WorkSessionResponseTO>(`${getServerUrl()}/production/work-sessions/open`, body);
        return r.data;
    }

    /**
     * @param silent - If true, no success/error toasts (e.g. best-effort end on component unmount).
     */
    static async endProductionWorkSession(sessionId: number, silent = false): Promise<WorkSessionResponseTO> {
        try {
            const r = await axios.post<WorkSessionResponseTO>(
                `${getServerUrl()}/production/work-sessions/${sessionId}/end`,
            );
            if (!silent) {
                toast.success(i18n.t("endProductionWorkSessionSuccess"));
            }
            return r.data;
        } catch (e) {
            console.log(e);
            if (!silent) {
                toast.error(i18n.t("endProductionWorkSessionError"));
            }
            throw e;
        }
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

}
