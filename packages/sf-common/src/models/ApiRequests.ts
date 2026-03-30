

export interface SessionTO {
    operatorID?: string,
    operatorName?: string,
    operatorSurname?: string,
    sessionID?: number | string,
    rawContainerID?: string,
    processedContainerID?: string,
    product2Add?: ProductTO,
    processedProducts?: ProductTO[],
    sessionStart?: any,
    sessionEnd?: any,
    finalizeSession?: boolean,
    productReferenceID?: string
}

export interface QualityInfoStepTO {
    id?: number,
    stepNumber?: number,
    stepDescription?: string,
    /** Raw Base64 or data URL; omit or empty to clear image */
    imageDataBase64?: string,
}

export interface ProductTO {
    id?: number,
    name?: string,
    description?: string,
    /** Catalogue / reference ID for the product */
    reference?: string,
    machineIds?: number[],
    /** Customers this product may be sold to (purchase orders). */
    customerIds?: number[],
    /** Single embedded setup template for the product (central). */
    setupDataPrototype?: SetupDataPrototypeTO,
    measuringFeaturePrototypes?: MeasuringFeaturePrototypeTO[],
    qualityInfoSteps?: QualityInfoStepTO[],
    /** Raw Base64 or data URL; omit while editing to keep existing; empty string clears */
    technicalDrawingBase64?: string,
}

export interface MachineBookingTO {
    id?: number,
    machineId?: number,
    machineName?: string,
    workOrderId?: number,
    startDateTime?: string,
    endDateTime?: string,
    type?: "PRODUCTION" | "MAINTENANCE" | "SETUP" | "OTHER",
    status?: "PLANNED" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
    comment?: string,
}

export interface SetupTO {
    toolID?: string,
    operationID?: string,
    measuredDiameter?: string,
    measuredDiameterOk?: boolean,
    measuredHeight?: string,
    measuredHeightOk?: boolean,
    setupReason?: string
}

export interface MeasuringFeatureTO {
    id?: string,
    catalogueId?: string,
    description?: string,
    classType?: string,
    frequency?: string,
    checkType?: "ATTRIBUTIVE" | "MEASURED",
    assessedValue?: string,
    assessedValueGood?: boolean,
    measuredByDevice?: boolean,
    refValue?: number,
    minTolerance?: number,
    maxTolerance?: number,
    toolType?: string,
    absoluteMeasure?: boolean
}

export interface MeasuringFeaturePrototypeTO {
    id?: number,
    catalogueId?: string,
    description?: string,
    refValue?: number,
    minTolerance?: number,
    maxTolerance?: number,
    classType?: string,
    frequency?: string,
    checkType?: "ATTRIBUTIVE" | "MEASURED" | string,
    toolType?: string,
    measuringTool?: string,
}

/** Setup tooling / measurement prototype rows embedded on a product (central). */
export interface SetupDataPrototypeTO {
    operationID?: string,
    toolID?: string,
    diameterRefValue?: number,
    diameterMaxPosTolerance?: number,
    diameterMaxNegTolerance?: number,
    heightRefValue?: number,
    heightMaxPosTolerance?: number,
    heightMaxNegTolerance?: number,
    attributiveHeightMeasurement?: boolean,
    attributiveDiameterMeasurement?: boolean,
}

export interface QRData {
    qrText: string,
    timeStamp?: string
}

export interface StationConfigDTO {
    controlProductPrefix: string,
    genericProductPrefix: string,
    rejectProductPrefix: string,
    calibrationProductPrefix: string,
    orangeProductPrefix: string,
    stationType?: string //WORKSTATION | CENTRAL
}

/** Central `./config/SelectOptions.json` — dropdown sources for products, purchase orders, production rejects, etc. */
export interface SelectOptionsTO {
    measuringTools?: string[],
    deliveryTerms?: string[],
    rejectCauses?: string[],
}

export interface ApplicationUserTO {
    name?: string,
    surname?: string,
    qrCode?: string,
    accountStatus?: string,
    role?: "ADMIN" | "OPERATOR",
    createdDate?: number[],
    id?: string
}

export interface CustomerTO {
    id?: number,
    companyName?: string,
    addressData?: string,
    description?: string
}

export interface ToolTO {
    id?: number,
    toolName?: string,
    toolDescription?: string
}

export interface MachineTO {
    id?: number,
    machineName?: string,
    manufacturer?: string,
    manufactureYear?: number,
    internalNumber?: string,
    serialNumber?: string,
    location?: string,
}

export interface ProductOrderTO {
    id?: number,
    product?: ProductTO,
    quantity?: number,
    pricePerUnit?: number
}

export interface PurchaseOrderTO {
    id?: number,
    customerId?: number,
    customer?: CustomerTO,
    productOrderList?: ProductOrderTO[],
    orderStatus?: string,
    currency?: string,
    deliveryDate?: string | number[] | null,
    deliveryTerms?: string,
    shippingAddress?: string,
    comment?: string,
    createdAt?: string,
    confirmedAt?: string,
    inProductionAt?: string,
    completedAt?: string,
    deliveredAt?: string
}

/** Work Order Central `EWorkOrderState` as returned by the API (Jackson default enum serialization). */
export type WorkOrderState = 'INCOMPLETE' | 'COMPLETE'

export interface WorkOrderTO {
    id?: number,
    /** Purchase order line (product line) this work order belongs to. */
    productOrderId?: number,
    /** Denormalized: parent purchase order (read from API for display). */
    purchaseOrderId?: number,
    productName?: string,
    productReference?: string,
    dueDate?: string,
    startDate?: string,
    endDate?: string,
    comment?: string,
    /** Quantity required by the product-order line (denormalized from backend). */
    requiredQuantity?: number,
    /** Produced good quantity aggregated across sessions (denormalized from backend). */
    producedGoodQuantity?: number,
    state?: WorkOrderState,
}

export interface ProductProfileTO {
    productReferenceID?: string,
    productName?: string,
    productDescription?: string,
    clientCompany?: ClientCompanyTO,
    operations?: OperationTO[]
    measuringFeatures?: MeasuringFeatureTO[],
    finalInspectionSteps?: FinalInspectionStepTO[],
    qualityInfoSteps?: QualityInfoStepDTO[],
    galiaSize?: number,
    galiaRowSize?: number,
    sicConstant?: string
}

export interface FinalInspectionStepTO {
    id?: number,
    fileName?: string,
    imageData?: string,
    inspectionDescription?: string,
    stepNumber?: number,
    inspectionTimeSeconds?: number
}
export interface QualityInfoStepDTO {
    id?: number,
    imageData?: string,
    stepDescription?: string,
    stepNumber?: number,
    inspectionDescription?: string,

}

export interface ClientCompanyTO {
    companyName?: string,
    companyDescription?: string,
    companyLogo?: string
}

export interface OperationTO {
    //   id?: string,
    operationID?: string,
    tools?: ToolTO[]
}

export interface ToolTO {
    // id?: string,
    toolID?: string,
    diameterRefValue?: number,
    diameterMeasuredValue?: number,
    diameterMaxPosTolerance?: number,
    diameterMaxNegTolerance?: number,
    heightRefValue?: number,
    heightMeasuredValue?: number,
    heightMaxPosTolerance?: number,
    heightMaxNegTolerance?: number,
    isAttributiveHeightMeasurement?: boolean,
    isAttributiveDiameterMeasurement?: boolean
}

export interface FetchParams {
    page?: number,
    rows?: number,
    sortBy?: string,
    asc?: boolean
}

export interface ProductsFetchParams extends FetchParams {
    qrPrefix?: string
}

export interface SessionFetchParams extends FetchParams {
    operatorQr?: string,
    sessionEndFrom?: string,
    sessionEndTo?: string,
    processedContainerQR?: string,
    sessionStartFrom?: string,
    sessionStartTo?: string
}

/** Response from POST /admin/sample-data/generate */
export interface SampleDataGenerationResultTO {
    machinesInserted: number,
    toolsInserted: number,
    productsInserted: number,
    customersInserted: number,
    usersInserted: number,
}





