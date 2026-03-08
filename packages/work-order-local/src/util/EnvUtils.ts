export function getServerUrl(): string {

    const serverIP: string = window.location.hostname;
    console.debug("Server URL: " + serverIP);

    return `http://${serverIP}:10000`;
}

