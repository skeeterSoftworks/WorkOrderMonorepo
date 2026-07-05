

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

/** Process / tooling data owned one-to-one by a central product (separate table on server). */
export interface TechnologyTO {
    id?: number,
    cycleTime?: string,
    norm100?: number,
    piecesPerMaterial?: number,
    tools?: ToolTO[],
}

export interface MaterialProviderTO {
    id?: number,
    name?: string,
    contactPerson?: string,
    emailAddress?: string,
    phoneNumber?: string,
    grade?: number,
}

export interface MaterialTO {
    id?: number,
    name?: string,
    code?: string,
    providers?: MaterialProviderTO[],
    /** Backward compatibility for legacy payloads; prefer `providers`. */
    provider?: MaterialProviderTO,
}

export interface StockedMaterialTO {
    id?: number,
    quantity?: number,
    material?: MaterialTO,
}

export interface StockLocationTO {
    id?: number,
    stockLocationCode?: string,
    stockedMaterials?: StockedMaterialTO[],
}

export interface MaterialReceptionStockAllocationTO {
    stockLocationId?: number,
    quantity?: number,
}

export interface MaterialOrderCertificateTO {
    certificateBase64?: string,
}

export type MaterialOrderStatus =
    | 'ORDER_CREATED'
    | 'ORDER_SENT'
    | 'ORDER_ACKNOWLEDGED'
    | 'ORDER_ACCEPTED'
    | 'IN_TRANSPORT'
    | 'RECEIVED_IN_STOCK'
    | 'VALIDATED'
    | 'REJECTED'

export interface MaterialOrderLineTO {
    id?: number,
    materialId?: number,
    materialName?: string,
    materialCode?: string,
    quantity?: number,
    received?: boolean,
    receivedQuantityTotal?: number,
    remainingQuantity?: number,
    deliveryNotes?: DeliveryNoteTO[],
    materialUnitOfMeasure?: ProductMaterialUnitOfMeasure,
    materialDiameter?: number,
    materialWeight?: number,
    materialLength?: number,
    materialWidth?: number,
}

export interface MaterialOrderTO {
    id?: number,
    /** Server-generated order number (NM + MMddyyyyHHmm). */
    code?: string,
    /** Sum of line quantities. */
    quantity?: number,
    /** Populated when the order has exactly one line (legacy list views). */
    materialId?: number,
    materialName?: string,
    materialCode?: string,
    materialProviderId?: number,
    materialProviderName?: string,
    status?: MaterialOrderStatus,
    /** ISO-8601 server timestamp when status was last changed. */
    lastChanged?: string,
    /** ISO-8601 server timestamp when the order was created. */
    createdAt?: string,
    /** ISO-8601 server timestamp when the order was rejected. */
    rejectedAt?: string,
    /** Raw Base64 or data URL for upload. */
    certificateBase64?: string,
    certificatePresent?: boolean,
    materialUnitOfMeasure?: ProductMaterialUnitOfMeasure,
    /** Nominal diameter from first/only line material (0 = not defined). */
    materialDiameter?: number,
    /** Nominal weight from first/only line material (0 = not defined). */
    materialWeight?: number,
    /** Nominal length from first/only line material (0 = not defined). */
    materialLength?: number,
    /** Nominal width from first/only line material (0 = not defined). */
    materialWidth?: number,
    lines?: MaterialOrderLineTO[],
}

export interface MaterialOrderSearchParams {
    page?: number,
    size?: number,
    sortBy?: string,
    asc?: boolean,
    status?: string,
    createdFrom?: string,
    createdTo?: string,
    code?: string,
    materialName?: string,
    materialProviderName?: string,
    quantity?: number,
    lastChangedFrom?: string,
    lastChangedTo?: string,
    certificatePresent?: boolean,
}

export interface MaterialOrderPageTO {
    content?: MaterialOrderTO[],
    totalElements?: number,
    page?: number,
    size?: number,
}

export interface DeliveryNoteTO {
    id?: number,
    materialOrderId?: number,
    materialOrderLineId?: number,
    deliveryNoteNumber?: string,
    /** ISO-8601 date-time of physical reception for this batch. */
    receivedAt?: string,
    quantity?: number,
}

export interface MaterialOrderReceptionInternalControlTO {
    diameterSamples?: number[],
    lengthSamples?: number[],
    widthSamples?: number[],
    weightSamples?: number[],
    overallWeight?: number,
    overallAcceptance?: boolean,
}

export interface MaterialOrderReceptionTO {
    id?: number,
    materialOrderId?: number,
    materialOrderLineId?: number,
    materialOrderCode?: string,
    materialCode?: string,
    materialName?: string,
    materialProviderName?: string,
    /** ISO-8601 date-time of physical reception. */
    receivedAt?: string,
    receivedQuantity?: number,
    /** User-entered delivery note number for this batch. */
    deliveryNoteNumber?: string,
    deliveryNoteId?: number,
    /** True when the order line is fully received after this batch. */
    lineFullyReceived?: boolean,
    internalControl?: MaterialOrderReceptionInternalControlTO,
    materialUnitOfMeasure?: ProductMaterialUnitOfMeasure,
    /** Nominal diameter from linked material (0 = not defined). */
    materialDiameter?: number,
    /** Nominal weight from linked material (0 = not defined). */
    materialWeight?: number,
    /** Nominal length from linked material (0 = not defined). */
    materialLength?: number,
    /** Nominal width from linked material (0 = not defined). */
    materialWidth?: number,
    /** Quantities to place at stock locations; sum must equal receivedQuantity. */
    stockAllocations?: MaterialReceptionStockAllocationTO[],
    /** Whether the linked material order has an uploaded certificate. */
    certificatePresent?: boolean,
}

export type EmailTemplateCode =
    | 'MATERIAL_ORDER_INQUIRY'
    | 'MATERIAL_ORDER_REMINDER'
    | 'MATERIAL_DELIVERY_LATE'

export interface EmailTemplateTO {
    code?: EmailTemplateCode,
    subjectTemplate?: string,
    bodyTemplate?: string,
}

export interface RenderedEmailTO {
    subject?: string,
    body?: string,
}

export const PRODUCT_MATERIAL_UNITS_OF_MEASURE = [
    'PCS',
    'KG',
    'G',
    'T',
    'M',
    'MM',
    'CM',
    'L',
    'ML',
    'M2',
    'M3',
] as const;

export type ProductMaterialUnitOfMeasure = typeof PRODUCT_MATERIAL_UNITS_OF_MEASURE[number];

export interface ProductMaterialTO {
    id?: number,
    materialId?: number,
    materialName?: string,
    materialCode?: string,
    quantityPerProductUnit?: number,
    unitOfMeasure?: ProductMaterialUnitOfMeasure,
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
    /** Bill of materials: material quantity consumed per one product unit. */
    productMaterials?: ProductMaterialTO[],
    technologyData?: TechnologyTO,
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
    /** @deprecated Use roles. Kept for backward compatibility when reading session data. */
    role?: string,
    roles?: ApplicationRole[],
    createdDate?: number[],
    id?: string | number,
}

export type ApplicationRole =
    | 'ADMIN'
    | 'OPERATOR'
    | 'ADMIN_TECHNOLOGY'
    | 'ADMIN_STOCK_INBOUND'
    | 'ADMIN_STOCK_OUTBOUND'
    | 'ADMIN_PRODUCTION'
    | 'SALES_ADMIN'
    | 'PURCHASING_ADMIN'
    | 'PRODUCTION_PLANNING_ADMIN'

export interface CustomerTO {
    id?: number,
    companyName?: string,
    addressData?: string,
    description?: string
}

/** Admin / catalogue tool (Work Order Central). */
export interface ToolTO {
    id?: number,
    toolName?: string,
    toolDescription?: string,
    orderNumber?: number,
    workingTime?: number,
    technologyId?: number,
}

export interface MachineTO {
    id?: number,
    machineName?: string,
    manufacturer?: string,
    manufactureYear?: number,
    internalNumber?: string,
    serialNumber?: string,
    location?: string,
    /** Raw Base64 or data URL; omit on update to keep existing; empty string clears. */
    machineImageBase64?: string,
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
    /** When true, linked work orders count fully toward finished-goods stock (internal demand). */
    internalStockDemand?: boolean,
    createdAt?: string,
    confirmedAt?: string,
    inProductionAt?: string,
    completedAt?: string,
    deliveredAt?: string,
    rejectedAt?: string,
    /** True when at least one work order exists for a line on this purchase order. */
    hasWorkOrder?: boolean,
}

/** Aggregated finished-good stock from work orders (external surplus + internal demand), per product. */
export interface ProductAvailableStockTO {
    productId?: number,
    productReference?: string,
    productName?: string,
    availableQuantity?: number,
}

/** Work Order Central `EWorkOrderState` as returned by the API (Jackson default enum serialization). */
export type WorkOrderState = 'INCOMPLETE' | 'COMPLETE'

export interface WorkOrderTO {
    id?: number,
    /** Purchase order line (product line) this work order belongs to. */
    productOrderId?: number,
    /** Denormalized: parent purchase order (read from API for display). */
    purchaseOrderId?: number,
    /** Denormalized: true when parent PO is internal stock demand. */
    internalStockDemand?: boolean,
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
    /** Optional finished-goods stock allocations when creating a work order. */
    stockAssignments?: WorkOrderStockAllocationTO[],
    /** Logged-in user QR code (create only); used on stock assignment PDF. */
    createdByUserQrCode?: string,
    /** Denormalized: 8-digit stock assignment order code when present. */
    stockAssignmentOrderCode?: string,
    /** Denormalized: stock assignment order fulfillment status. */
    stockAssignmentOrderStatus?: StockAssignmentOrderStatus,
}

export type StockAssignmentOrderStatus = 'UNASSIGNED' | 'ASSIGNED'

export interface StockAssignmentOrderTO {
    id?: number,
    code?: string,
    workOrderId?: number,
    productId?: number,
    productReference?: string,
    productName?: string,
    quantity?: number,
    status?: StockAssignmentOrderStatus,
    createdAt?: string,
    createdByFullName?: string,
    assignedAt?: string,
    assignedByUserQr?: string,
    assignedByFullName?: string,
}

export type StockOrderHistoryProductType = 'FINISHED_PRODUCT' | 'MATERIAL'

export interface StockOrderHistoryRowTO {
    id?: number,
    code?: string,
    productType?: StockOrderHistoryProductType,
    workOrderId?: number,
    productId?: number,
    productReference?: string,
    productName?: string,
    quantity?: number,
    assignedAt?: string,
    assignedByFullName?: string,
    assignedByUserQr?: string,
}

export interface StockOrderHistoryPageTO {
    content?: StockOrderHistoryRowTO[],
    totalElements?: number,
    page?: number,
    size?: number,
}

export interface StockOrderHistorySearchParams {
    page?: number,
    size?: number,
    sortBy?: string,
    asc?: boolean,
    productType?: string,
    assignedFrom?: string,
    assignedTo?: string,
    assignedBy?: string,
}

export interface FulfillStockAssignmentOrderRequestTO {
    code?: string,
    operatorUserQrCode?: string,
}

export interface WorkOrderStockAllocationTO {
    quantity?: number,
}

export interface ProductStockAvailabilityTO {
    productId?: number,
    productReference?: string,
    productName?: string,
    availableQuantity?: number,
}

export interface WorkOrderMaterialRequirementLineTO {
    materialId?: number,
    materialCode?: string,
    materialName?: string,
    unitOfMeasure?: ProductMaterialUnitOfMeasure,
    requiredQuantity?: number,
    availableQuantity?: number,
    missingQuantity?: number,
}

export interface WorkOrderMaterialRequirementsTO {
    productId?: number,
    productReference?: string,
    productName?: string,
    productQuantity?: number,
    hasBillOfMaterials?: boolean,
    fullyAvailable?: boolean,
    lines?: WorkOrderMaterialRequirementLineTO[],
}

export interface WorkOrderCreateResultTO {
    workOrder?: WorkOrderTO,
    stockAssignmentOrderPdfBase64?: string,
    materialRequirementsPdfBase64?: string,
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
    tools?: OperationToolTO[]
}

/** Tool dimensions / setup state on a work-session operation (not the central Tool catalogue). */
export interface OperationToolTO {
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

export const PRODUCT_STOCK_INTAKE_UNITS_OF_MEASURE = [
    'PIECES',
    'GRAM',
    'KILOGRAM',
] as const;

export type ProductStockIntakeUnitOfMeasure = typeof PRODUCT_STOCK_INTAKE_UNITS_OF_MEASURE[number];

export interface ProductCatalogEntryTO {
    id?: number,
    reference?: string,
    name?: string,
}

export interface ProductStockIntakeWorkOrderOptionTO {
    id?: number,
    productReference?: string,
    productName?: string,
    requiredQuantity?: number,
    producedGoodQuantity?: number,
    receivedToStockQuantity?: number,
    receivedOrderQuantity?: number,
    internalStockDemand?: boolean,
    state?: WorkOrderState,
}

export interface ProductStockIntakeTO {
    id?: number,
    productId?: number,
    productReference?: string,
    productName?: string,
    workOrderId?: number,
    surplusQuantity?: number,
    stickerNumber?: string,
    unitOfMeasure?: ProductStockIntakeUnitOfMeasure,
    quantity?: number,
    /** ISO-8601 date-time. */
    receivedAt?: string,
}



