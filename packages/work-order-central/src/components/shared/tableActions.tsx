import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

/** Table body/header cell: keeps action icons on one horizontal line. */
export const tableActionsTableCellSx: SxProps<Theme> = {
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
};

/** IconButton `sx` presets: view = blue, edit = green, delete = red. */
export const tableActionIconButtonSx = {
    view: { color: 'primary.main' } satisfies SxProps<Theme>,
    edit: { color: 'success.main' } satisfies SxProps<Theme>,
    delete: { color: 'error.main' } satisfies SxProps<Theme>,
} as const;

/** Other row actions (e.g. schedule) — neutral so they do not clash with view/edit/delete. */
export const tableActionIconButtonOtherSx: SxProps<Theme> = {
    color: 'text.secondary',
};

export function TableActionsRow({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0,
            }}
        >
            {children}
        </Box>
    );
}
