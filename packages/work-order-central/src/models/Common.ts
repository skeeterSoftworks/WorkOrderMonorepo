export interface ProductVO {
    qr: string,
    type: string
}


export interface LoggedUser {
    role?: string,
    name?: string,
    surname?: string,
    qrCode?: string
}

export interface StationHeartbeat extends StationDTO{
    heartbeatType?: EHeartbeatType,
    message?: string,
    time?: string,
}

export type EHeartbeatType = "SESSION_OPEN" | "SESSION_CLOSED" | "SESSION_ADDED"| "HELP"| "PROCESSED_WHITE"| "PROCESSED_CONTROL"|
    "PROCESSED_RUS"| "PROCESSED_SETUP" | "PROCESSED_ORANGE" | "ISSUE_RESOLVED" | "SIC_QR_BINDING_COMPLETE" |
 "FI_CHECK_PROGRESS"

export interface StationDTO {
    id?: string,
    stationId?: string,
    macAddress?: string,
    stationType?: string
}


