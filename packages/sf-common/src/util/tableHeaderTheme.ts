import type {Theme} from '@mui/material/styles';

/** Shared MUI theme fragment: grey header bar for all `Table` / `TableHead` usage. */
export const TABLE_HEADER_BACKGROUND = '#bdbdbd';

export const muiTableHeaderThemeComponents = {
    MuiTableHead: {
        styleOverrides: {
            root: {
                backgroundColor: TABLE_HEADER_BACKGROUND,
            },
        },
    },
    MuiTableCell: {
        styleOverrides: {
            head: ({theme}: {theme: Theme}) => ({
                backgroundColor: TABLE_HEADER_BACKGROUND,
                color: theme.palette.text.primary,
            }),
        },
    },
};
