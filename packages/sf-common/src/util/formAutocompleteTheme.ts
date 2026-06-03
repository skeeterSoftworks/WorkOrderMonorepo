/** Shared MUI theme fragment: disable browser autocomplete on form inputs. */
export const formAutocompleteThemeComponents = {
    MuiTextField: {
        defaultProps: {
            autoComplete: 'off',
        },
    },
    MuiInputBase: {
        defaultProps: {
            autoComplete: 'off',
        },
    },
};
