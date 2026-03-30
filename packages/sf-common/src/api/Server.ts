import type {
    ApplicationUserTO,
    StationConfigDTO,
    SelectOptionsTO,
    PurchaseOrderTO,
    ProductTO,
    CustomerTO,
    MachineTO,
    WorkOrderTO,
    MachineBookingTO,
    SampleDataGenerationResultTO,
} from "../models/ApiRequests";
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

    static getPurchaseOrderById(id: number, onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/purchaseorder/${id}`)
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

    static getAllWorkOrders(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/workorders/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addWorkOrder(workOrder: WorkOrderTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/workorders/add`, workOrder)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static editWorkOrder(workOrder: WorkOrderTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/workorders/update`, workOrder)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static deleteWorkOrder(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/workorders/${id}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static getMachineBookingsForMachine(machineId: number, fromIso: string, toIso: string, onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/machine-bookings/machine/${machineId}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static getMachineBookingsForWorkOrder(workOrderId: number, onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/machine-bookings/work-order/${workOrderId}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addMachineBooking(booking: MachineBookingTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/machine-bookings/add`, booking)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static updateMachineBooking(booking: MachineBookingTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/machine-bookings/update`, booking)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static cancelMachineBooking(id: number, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/machine-bookings/${id}/cancel`)
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

    static getAllCustomers(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/customers/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addCustomer(customer: CustomerTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/customers/add`, customer)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static editCustomer(customer: CustomerTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/customers/update`, customer)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static deleteCustomer(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/customers/${id}`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static getAllMachines(onSuccess: Function, onError: Function) {
        axios.get(`${getServerUrl()}/machines/all`)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static addMachine(machine: MachineTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/machines/add`, machine)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static editMachine(machine: MachineTO, onSuccess: Function, onError: Function) {
        axios.post(`${getServerUrl()}/machines/update`, machine)
            .then(response => onSuccess(response))
            .catch(error => {
                console.log(error);
                onError(error);
            });
    }

    static deleteMachine(id: number, onSuccess: Function, onError: Function) {
        axios.delete(`${getServerUrl()}/machines/${id}`)
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

    static generateSampleData(
        onSuccess: (result: SampleDataGenerationResultTO) => void,
        onError: (error: unknown) => void,
    ) {
        axios
            .post<SampleDataGenerationResultTO>(`${getServerUrl()}/admin/sample-data/generate`)
            .then((response) => onSuccess(response.data))
            .catch((error) => {
                console.error(error);
                onError(error);
            });
    }

    static getSelectOptions(onSuccess: Function, onError?: Function) {
        axios
            .get<SelectOptionsTO>(`${getServerUrl()}/config/select-options`)
            .then((response) => onSuccess(response))
            .catch((error) => {
                console.log(error);
                onError && onError(error);
            });
    }

    static saveSelectOptions(options: SelectOptionsTO, onSuccess: Function, onError?: Function) {
        axios
            .put(`${getServerUrl()}/config/select-options`, options)
            .then((response) => onSuccess(response))
            .catch((error) => {
                console.log(error);
                onError && onError(error);
            });
    }
}
