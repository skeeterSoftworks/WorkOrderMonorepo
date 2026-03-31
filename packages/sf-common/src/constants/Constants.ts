//export const SOCKET_URL: string = 'ws://localhost:10000/ws-message';

import { getServerUrl } from "../util/EnvUtils";


export const SOCKET_URL: string = getServerUrl().replace("http", "ws") + '/ws-message';


export const measuringFeaturesTableHeaders: string[] = ["catalogueId", "description", "specification", "classType",
    "frequency", "checkType"]


export const mfClassTypes: string[] = ["CC", "CIC", "NORM"]