const BACKEND_PORTS = new Set(["10000", "10001", "10002"]);

export function getServerUrl(): string {
    if (typeof window !== "undefined" && window.location?.hostname) {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        const pagePort = window.location.port;

        if (pagePort && BACKEND_PORTS.has(pagePort)) {
            return `${protocol}//${hostname}:${pagePort}`;
        }

        return `${protocol}//${hostname}:10001`;
    }

    return "http://localhost:10001";
}
