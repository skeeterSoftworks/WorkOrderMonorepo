import type {SxProps, Theme} from '@mui/material/styles';

/** Shared layout for wide control-product dialogs. */
export const controlProductDialogPaperSx = {
    width: 'min(1200px, 96vw)',
    maxWidth: '96vw',
    maxHeight: 'min(92vh, 920px)',
    minHeight: 'min(78vh, 680px)',
} as const;

/** Match {@link ProductionWorkSessionPanel} action button colors. */
export const WORK_SESSION_FAULTY_HEADER_BG = '#c62828';
export const WORK_SESSION_CONTROL_HEADER_BG = '#2e7d32';
export const WORK_SESSION_SETUP_HEADER_BG = '#6a1b9a';

const workSessionModalTitleContrast: SxProps<Theme> = {
    color: '#fff',
    fontWeight: 600,
    letterSpacing: '0.02em',
    lineHeight: 1.3,
    textShadow: '0 1px 1px rgba(0,0,0,0.2)',
};

export const faultyProductDialogTitleSx: SxProps<Theme> = {
    bgcolor: WORK_SESSION_FAULTY_HEADER_BG,
    ...workSessionModalTitleContrast,
    py: 1.75,
    px: 3,
    boxSizing: 'border-box',
    borderBottom: '1px solid rgba(0,0,0,0.15)',
};

export const controlProductDialogTitleSx: SxProps<Theme> = {
    bgcolor: WORK_SESSION_CONTROL_HEADER_BG,
    ...workSessionModalTitleContrast,
    py: 1.75,
    px: 3,
    boxSizing: 'border-box',
    borderBottom: '1px solid rgba(0,0,0,0.15)',
};

export const setupProductDialogTitleSx: SxProps<Theme> = {
    bgcolor: WORK_SESSION_SETUP_HEADER_BG,
    ...workSessionModalTitleContrast,
    py: 1.75,
    px: 3,
    boxSizing: 'border-box',
    borderBottom: '1px solid rgba(0,0,0,0.15)',
};
