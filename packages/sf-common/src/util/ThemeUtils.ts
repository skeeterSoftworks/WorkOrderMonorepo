import { createTheme } from "@mui/material";
import { blueGrey, cyan, green } from "@mui/material/colors";
import { muiTableHeaderThemeComponents } from "./tableHeaderTheme";
import { formAutocompleteThemeComponents } from "./formAutocompleteTheme";


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

		},
		components: {
			...muiTableHeaderThemeComponents,
			...formAutocompleteThemeComponents,
		},
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

		},
		components: {
			...muiTableHeaderThemeComponents,
			...formAutocompleteThemeComponents,
		},
	})

}

export function getDispenserTheme() {
	return createTheme({
		palette: {
			primary: {
				main: cyan[900]
			},
			secondary: {
				main: cyan[100]
			},
			background: {
				default: "#E8F5E9"
			}

		},
		components: {
			...muiTableHeaderThemeComponents,
			...formAutocompleteThemeComponents,
		},
	})

}