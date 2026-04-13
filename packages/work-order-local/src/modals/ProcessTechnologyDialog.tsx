import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import {useTranslation} from 'react-i18next';
import type {BoundMachineTechnologyTO} from '../models/ApiRequests';
import {processProductDialogTitleSx, workSessionProcessButtonSx} from './workSessionDialogStyles';

function readOnlyField(label: string, value: string) {
    return (
        <TextField
            label={label}
            value={value}
            fullWidth
            size="small"
            InputProps={{readOnly: true}}
            sx={{'& .MuiInputBase-input': {cursor: 'default'}}}
        />
    );
}

export type ProcessTechnologyDialogProps = {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    technology: BoundMachineTechnologyTO | null;
    productHint?: string;
};

export function ProcessTechnologyDialog({
    open,
    onClose,
    loading,
    technology,
    productHint,
}: ProcessTechnologyDialogProps) {
    const {t} = useTranslation();
    const tools = technology?.tools ?? [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{...processProductDialogTitleSx, display: 'flex', alignItems: 'center', gap: 1}}>
                <Box component="span" sx={{flex: 1}}>
                    {t('processTechnologyModalTitle')}
                </Box>
                <IconButton size="small" onClick={onClose} aria-label={t('close')} sx={{color: 'text.primary'}}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
                        {productHint?.trim() ? (
                            <Typography variant="body2" color="text.secondary">
                                {productHint}
                            </Typography>
                        ) : null}
                        {!technology ? (
                            <Typography variant="body2" color="text.secondary">
                                {t('processTechnologyNoData')}
                            </Typography>
                        ) : (
                            <>
                                {readOnlyField(
                                    t('processTechnologyCycleTime'),
                                    technology.cycleTime?.trim() || '—',
                                )}
                                {readOnlyField(
                                    t('processTechnologyNorm85'),
                                    technology.norm85 != null ? String(technology.norm85) : '—',
                                )}
                                {readOnlyField(
                                    t('processTechnologyNorm100'),
                                    technology.norm100 != null ? String(technology.norm100) : '—',
                                )}
                                {readOnlyField(
                                    t('processTechnologyPiecesPerMaterial'),
                                    technology.piecesPerMaterial != null
                                        ? String(technology.piecesPerMaterial)
                                        : '—',
                                )}

                                <Typography variant="subtitle2" sx={{mt: 1}}>
                                    {t('processTechnologyToolsSection')}
                                </Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{t('processTechnologyToolName')}</TableCell>
                                                <TableCell>{t('processTechnologyToolDescription')}</TableCell>
                                                <TableCell>{t('processTechnologyToolOrder')}</TableCell>
                                                <TableCell>{t('processTechnologyToolWorkingTime')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {tools.length > 0 ? (
                                                tools.map((tool, idx) => (
                                                    <TableRow key={tool.id ?? `t-${idx}`}>
                                                        <TableCell>{tool.toolName ?? '—'}</TableCell>
                                                        <TableCell>{tool.toolDescription ?? '—'}</TableCell>
                                                        <TableCell>
                                                            {tool.orderNumber != null ? String(tool.orderNumber) : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {tool.workingTime != null ? String(tool.workingTime) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {t('processTechnologyNoTools')}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{px: 3, py: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider'}}>
                <Button variant="outlined" color="inherit" onClick={onClose} sx={{...workSessionProcessButtonSx}}>
                    {t('close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
