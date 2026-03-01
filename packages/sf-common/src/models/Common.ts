import {ProductTO} from "./ApiRequests";

export interface ProductVO {
    qr: string,
    type: string
}

export type ProductType = "GENERIC" | "CALIBRATION" | "REJECT" | "CONTROL"

export type SessionFilterMode = "Product" | "Operator" | "Date"


export enum EClientMode {
    Traceability, Dispenser
}

export interface LoggedUser {
    role?: string,
    name?: string,
    surname?: string,
    qrCode?: string
}

export interface UpdateProductRequest {
    previousProductQr: string,
    newProductTO: ProductTO,
    conformityDeclaration: string,
    updatedBy: string
}
