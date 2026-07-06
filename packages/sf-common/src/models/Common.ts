import type { ProductTO } from "./ApiRequests";

export interface ProductVO {
    qr: string,
    type: string
}

export type ProductType = "GENERIC" | "CALIBRATION" | "REJECT" | "CONTROL"

export type SessionFilterMode = "Product" | "Operator" | "Date"


export const EClientMode = {
    Traceability: "Traceability",
    Dispenser: "Dispenser",
} as const;

export type EClientMode = (typeof EClientMode)[keyof typeof EClientMode];

export interface LoggedUser {
    role?: string,
    roles?: string[],
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
