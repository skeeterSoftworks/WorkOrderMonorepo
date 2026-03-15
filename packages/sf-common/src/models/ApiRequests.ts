

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

export interface ProductTO {
    id?: number,
    name?: string,
    description?: string,
    machineId?: number,
    toolId?: number,
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
    cycleTime?: number,
    barLocation?: string,
    piecesPerBar?: number,
    barsPerSeries?: number,
    barsCount?: number,
    weightPerBar?: number,
    sumBarWeight?: number,
    seriesID?: string,
    tools?: ToolTO[]
}

export interface ProductOrderTO {
    id?: number,
    product?: ProductTO,
    quantity?: number,
    pricePerUnit?: number
}

export interface PurchaseOrderTO {
    id?: number,
    customer?: CustomerTO,
    productOrderList?: ProductOrderTO[],
    orderStatus?: string,
    currency?: string,
    deliveryDate?: string | number[] | null,
    reference?: string,
    deliveryTerms?: string,
    shippingAddress?: string,
    comment?: string
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





