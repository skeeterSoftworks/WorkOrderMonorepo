import { EClientMode } from "../models/Common";

const BACKEND_PORTS = new Set(["10000", "10001", "10002"]);

export function getClientMode(): EClientMode {
    return process.env.REACT_APP_CLIENT_MODE === "Traceability" ? EClientMode.Traceability : EClientMode.Dispenser;
}

export function getServerUrl(): string {
    if (typeof window !== "undefined" && window.location?.hostname) {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        const pagePort = window.location.port;

        if (pagePort && BACKEND_PORTS.has(pagePort)) {
            return `${protocol}//${hostname}:${pagePort}`;
        }

        const apiPort = process.env.REACT_APP_API_PORT || "10001";
        return `${protocol}//${hostname}:${apiPort}`;
    }

    return process.env.REACT_APP_SERVER_URL || "http://localhost:10001";
}

