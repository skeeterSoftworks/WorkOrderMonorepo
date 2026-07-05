import type {
    MaterialOrderReceptionInternalControlTO,
    MaterialOrderReceptionTO,
    MaterialOrderTO,
    ProductCatalogEntryTO,
    ProductStockIntakeTO,
    ProductStockIntakeWorkOrderOptionTO,
    StockLocationTO,
    StockOrderHistorySearchParams,
} from "sf-common/src/models/ApiRequests";
import type {
    BoundMachineProductTO,
    CentralMachineTO,
    ProductionWorkSessionConfigTO,
    QualityInfoStepTO,
    WorkSessionControlProductCreateTO,
    WorkSessionFaultyProductCreateTO,
    WorkSessionGoodDeltaTO,
    WorkSessionHelpSignalTO,
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

    static async getProductionWorkSessionConfig(): Promise<ProductionWorkSessionConfigTO> {
        const r = await axios.get<ProductionWorkSessionConfigTO>(`${getServerUrl()}/config/production-work-session`);
        return r.data ?? {};
    }

    static getMachinesFromCentralViaLocal(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/machines/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    /** Bound workstation machine row from central (via local proxy). */
    static async getCentralMachineById(machineId: number): Promise<CentralMachineTO | null> {
        try {
            const r = await axios.get<CentralMachineTO>(`${getServerUrl()}/machines/${machineId}`);
            return r.data ?? null;
        } catch {
            return null;
        }
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

    static async postProductionHelpRequired(sessionId: number, body?: WorkSessionHelpSignalTO): Promise<void> {
        await axios.post(`${getServerUrl()}/production/work-sessions/${sessionId}/help-required`, body ?? {});
    }

    static async postProductionHelpResolved(sessionId: number, body?: WorkSessionHelpSignalTO): Promise<void> {
        await axios.post(`${getServerUrl()}/production/work-sessions/${sessionId}/help-resolved`, body ?? {});
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

    static getMaterialOrdersOpenForReception(onSuccess: Function, onError?: Function) {
        axios.get<MaterialOrderTO[]>(`${getServerUrl()}/material-orders/open-for-reception`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static recordMaterialOrderReception(
        body: MaterialOrderReceptionTO,
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.post<MaterialOrderReceptionTO>(`${getServerUrl()}/material-order-receptions/record`, body)
            .then(response => {
                toast.success(i18n.t("toastMaterialOrderReceptionRecorded"));
                onSuccess(response);
            })
            .catch(error => {
                console.log(error);
                const msg = error?.response?.data;
                if (typeof msg === "string" && msg.length > 0) {
                    toast.error(i18n.t(msg, { defaultValue: msg }));
                } else {
                    toast.error(i18n.t("toastMaterialOrderReceptionError"));
                }
                onError && onError(error);
            });
    }

    static getMaterialOrderReceptionsPendingValidation(onSuccess: Function, onError?: Function) {
        axios.get<MaterialOrderReceptionTO[]>(`${getServerUrl()}/material-order-receptions/pending-validation`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static submitMaterialOrderInternalControl(
        receptionId: number,
        body: MaterialOrderReceptionInternalControlTO,
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.post<MaterialOrderReceptionTO>(
            `${getServerUrl()}/material-order-receptions/${receptionId}/submit-internal-control`,
            body,
        )
            .then(response => {
                toast.success(i18n.t("toastMaterialOrderValidated"));
                onSuccess(response);
            })
            .catch(error => {
                console.log(error);
                const msg = error?.response?.data;
                if (typeof msg === "string" && msg.startsWith("MATERIAL_ORDER_RECEPTION_SAMPLES")) {
                    toast.error(i18n.t("materialInternalControlSamplesRequired"));
                } else if (typeof msg === "string" && msg.length > 0) {
                    toast.error(i18n.t(msg, { defaultValue: msg }));
                } else {
                    toast.error(i18n.t("toastMaterialOrderValidationError"));
                }
                onError && onError(error);
            });
    }

    static getAllStockLocations(onSuccess: Function, onError?: Function) {
        axios.get<StockLocationTO[]>(`${getServerUrl()}/stock-locations/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getProductStockAvailability(onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/stock/products-availability`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getStockAssignmentOrderByCode(code: string, onSuccess: Function, onError?: Function) {
        axios.get(`${getServerUrl()}/stock/assignment-orders/${encodeURIComponent(code)}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static fulfillStockAssignmentOrder(
        body: { code?: string; operatorUserQrCode?: string },
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.post(`${getServerUrl()}/stock/assignment-orders/fulfill`, body)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static fulfillMaterialAssignmentOrder(
        body: { code?: string; operatorUserQrCode?: string },
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.post(`${getServerUrl()}/stock/material-assignment-orders/fulfill`, body)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static searchStockOrderHistory(
        params: StockOrderHistorySearchParams,
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.get(`${getServerUrl()}/stock/order-history/search`, { params })
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getProductCatalog(onSuccess: Function, onError?: Function) {
        axios.get<ProductCatalogEntryTO[]>(`${getServerUrl()}/products/catalog`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getRecentProductStockIntakes(onSuccess: Function, onError?: Function, limit = 50) {
        axios.get<ProductStockIntakeTO[]>(`${getServerUrl()}/stock/product-intakes/recent`, { params: { limit } })
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static getProductStockIntakeWorkOrders(productId: number, onSuccess: Function, onError?: Function) {
        axios.get<ProductStockIntakeWorkOrderOptionTO[]>(
            `${getServerUrl()}/stock/product-intakes/work-orders`,
            { params: { productId } },
        )
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError && onError(error);
            });
    }

    static recordProductStockIntake(
        body: ProductStockIntakeTO,
        onSuccess: Function,
        onError?: Function,
    ) {
        axios.post<ProductStockIntakeTO>(`${getServerUrl()}/stock/product-intakes/record`, body)
            .then(response => {
                toast.success(i18n.t("toastProductStockIntakeRecorded"));
                onSuccess(response);
            })
            .catch(error => {
                console.log(error);
                const msg = error?.response?.data;
                if (typeof msg === "string" && msg.length > 0) {
                    toast.error(i18n.t(msg, { defaultValue: msg }));
                } else {
                    toast.error(i18n.t("toastProductStockIntakeError"));
                }
                onError && onError(error);
            });
    }

}
