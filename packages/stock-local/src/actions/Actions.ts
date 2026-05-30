export const addToAppStore = (key: string, value: any) => {
	return {
		type: "ADD_TO_APP_STORE",
		key: key,
		value: value
	}
}

export const openErrorModal = ( errorModalMessage: string) => {
	return {
		type: "OPEN_ERROR_MODAL",
		errorModalMessage: errorModalMessage,
	}
}

export const closeErrorModal = () => {
	return {
		type: "CLOSE_ERROR_MODAL",
	}
}