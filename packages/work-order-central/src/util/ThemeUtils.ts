import { createTheme } from "@mui/material";
import { blueGrey, green } from "@mui/material/colors";


export function getLocalStationTheme() {
	return createTheme({
		palette: {
			primary: {
				main: green[900]
			},
			secondary: {
				main: green[100]
			},
			background: {
				default: "#E8F5E9"
			}

		}
	})

}

export function getCentralTheme() {
	return createTheme({
		palette: {
			primary: {
				main: blueGrey[900]
			},
			secondary: {
				main: blueGrey[100]
			},
			background: {
				default: "#E8F5E9"
			}

		}
	})

}

