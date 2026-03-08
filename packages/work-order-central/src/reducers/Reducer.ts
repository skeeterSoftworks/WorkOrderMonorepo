

export const reducer = (state = {}, action: any) => {


	switch (action.type) {
		case "ADD_TO_APP_STORE":
			return {
				...state,
				[action.key]: action.value
			}
		case "OPEN_ERROR_MODAL":
			return {
				...state,
				errorModalOpen: true,
				errorModalMessage: action.errorModalMessage
			}
		case "CLOSE_ERROR_MODAL":
			return {
				...state,
				errorModalOpen: false,
				errorModalMessage: null
			}

		default: return state;
	}


}