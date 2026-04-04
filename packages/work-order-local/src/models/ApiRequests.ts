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

export interface MeasuringFeaturePrototypeTO {
    id?: number
    catalogueId?: string
    description?: string
    refValue?: number
    minTolerance?: number
    maxTolerance?: number
    classType?: string
    frequency?: string
    checkType?: 'ATTRIBUTIVE' | 'MEASURED' | string
    measuringTool?: string
}

export interface QRData {
    qrText: string,
    timeStamp?: string
}

/** Local `/config/station-config` (includes preconditions JSON from central). */
export interface StationConfigWithPreconditionsTO {
    machineName?: string,
    woPreconditionsJSON?: string,
}

/** Local `workstation-machine.json` + `/config/workstation-machine`. */
export interface WorkstationMachineConfigTO {
    machineName?: string | null,
    machineId?: number | null,
}

/** Local → central (proxied) work session. */
export interface QualityInfoStepTO {
    id?: number;
    stepNumber?: number;
    stepDescription?: string;
    imageDataBase64?: string;
}

/** Embedded on central product; mirrored from workstation-bound product list. */
export interface SetupDataPrototypeTO {
    operationID?: string;
    toolID?: string;
    diameterRefValue?: number;
    diameterMaxPosTolerance?: number;
    diameterMaxNegTolerance?: number;
    heightRefValue?: number;
    heightMaxPosTolerance?: number;
    heightMaxNegTolerance?: number;
    attributiveHeightMeasurement?: boolean;
    attributiveDiameterMeasurement?: boolean;
}

/** Optional payload when recording setup on a work session. */
export interface WorkSessionSetupProductCreateTO {
    measuredHeight?: string;
    measuredHeightOk?: boolean;
    measuredDiameter?: string;
    measuredDiameterOk?: boolean;
}

export interface SetupProductTO {
    id?: number;
    recordedAt?: string;
    prototypeSnapshot?: SetupDataPrototypeTO;
    measuredHeight?: string;
    measuredHeightOk?: boolean;
    measuredDiameter?: string;
    measuredDiameterOk?: boolean;
}

/** Central product for the workstation-bound machine (quality steps editor). */
export interface BoundMachineProductTO {
    id?: number;
    name?: string;
    reference?: string;
    description?: string;
    setupDataPrototype?: SetupDataPrototypeTO;
    qualityInfoSteps?: QualityInfoStepTO[];
}

export interface WorkSessionOpenRequestTO {
    workOrderId?: number;
    operatorQrCode?: string;
    operatorName?: string;
    operatorSurname?: string;
    stationId?: string;
}

export interface WorkSessionResponseTO {
    id?: number;
    workOrderId?: number;
    sessionStart?: string;
    sessionEnd?: string;
    productCount?: number;
    controlProductCount?: number;
    faultyProductCount?: number;
    setupProductCount?: number;
    setupProducts?: SetupProductTO[];
    productReferenceID?: string;
    operatorQrCode?: string;
    operatorName?: string;
    operatorSurname?: string;
    stationId?: string;
    workOrderCompletedByTarget?: boolean;
    measuringFeaturePrototypes?: MeasuringFeaturePrototypeTO[];
    /** Raw Base64 technical drawing for the work order product (control product modals). */
    technicalDrawingBase64?: string;
}

export interface WorkSessionMeasuringFeatureInputTO {
    catalogueId?: string;
    /** Digits-only for MEASURED features. */
    assessedValue?: string;
    /** For ATTRIBUTIVE features. */
    assessedValueGood?: boolean;
}

export interface WorkSessionControlProductCreateTO {
    measuringFeatures?: WorkSessionMeasuringFeatureInputTO[];
}

export interface WorkSessionFaultyProductCreateTO {
    rejectReason?: string;
    rejectCause?: string;
    rejectComment?: string;
}

export interface WorkSessionGoodDeltaTO {
    delta: number;
    productReferenceID?: string;
}

/** Proxied from central for production (subset of fields). */
export type ProductionWorkOrderState = 'INCOMPLETE' | 'COMPLETE';

export interface ProductionWorkOrderTO {
    id?: number,
    productOrderId?: number,
    purchaseOrderId?: number,
    productName?: string,
    productReference?: string,
    requiredQuantity?: number,
    producedGoodQuantity?: number,
    state?: ProductionWorkOrderState,
    dueDate?: string,
    startDate?: string,
    endDate?: string,
    comment?: string,
}

/** Proxied from central `/machines/all` or `/machines/{id}`. */
export interface CentralMachineTO {
    id?: number,
    machineName?: string,
    machineImageBase64?: string,
}

export interface WorkStationPreconditionItem {
    sr?: string,
    en?: string,
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





