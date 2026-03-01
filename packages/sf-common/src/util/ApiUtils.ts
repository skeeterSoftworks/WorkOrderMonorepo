

export function composeGetParams(params: object): string {

    if (!params) {
        return ""
    }

    let paramsString: string = "";


    const keys: string[] = Object.keys(params);

    for (const key of keys) {

        if (params[key]) {
            paramsString += key;
            paramsString += "="
            paramsString += params[key]

            if (keys.indexOf(key) != keys.length - 1) {
                paramsString += "&"
            }
        }
    }

    return paramsString;
}