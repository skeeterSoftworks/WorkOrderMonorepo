import { EClientMode } from "../models/Common";


export function getClientMode(): EClientMode {
    return process.env.REACT_APP_CLIENT_MODE === "Traceability" ? EClientMode.Traceability : EClientMode.Dispenser;
}

export function getServerUrl(): string {
    return process.env.REACT_APP_SERVER_URL || "http://localhost:10001"
}

