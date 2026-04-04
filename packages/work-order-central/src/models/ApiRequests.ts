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
    productName?: string,
    description?: string,
    productState?: string,
    referenceID?: string,
    qrCode?: string,
    reject?: boolean,
    rejectReason?: string,
    rejectCause?: string,
    rejectComment?: string,
    cell?: string,
    operation?: string,
    session?: SessionTO,
    measuringFeaturesList?: MeasuringFeatureTO[],
    controlProductGood?: string | boolean,
    processingDate?: any,
    setupData?: SetupTO,
    comment?: string,
    sicData?: SicDataDTO,
}

export interface SicDataDTO {
    sicEngraved?: boolean,
    sicTimestamp?: any,
    sicCountRef?: string,
    sicCountShift?: string,
    sicCountTotal?: string,
    sicDmc?: string,
    sicGradeNorm?: string,
    sicOperatorFullName?: string
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



export interface WipReportRequest {
    referenceNumbers: string[],
    dateFrom?: string,
    dateUntil?: string
}

/** Matches server `LicenseActivationInfoTO`. */
export interface LicenseActivationInfoTO {
    scenario?: string
    macAddresses?: string[]
    issuedTo?: string
    validUntil?: string
    timeLimitedExpired?: boolean | null
    licenseMacAddress?: string
    macMatchesLicense?: boolean
    errorMessage?: string
}





