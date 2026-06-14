import { Box, Collapse, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeliveryNoteTO } from 'sf-common/src/models/ApiRequests';

function formatDeliveryNoteDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}

type Props = {
    notes: DeliveryNoteTO[];
    rowKey: string;
};

export function MaterialDeliveryNotesPanel({ notes, rowKey }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    if (!notes.length) {
        return (
            <Typography variant="caption" color="text.secondary">
                {t('deliveryNotesNone')}
            </Typography>
        );
    }
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                    {t('deliveryNotesCount', { count: notes.length })}
                </Typography>
                <IconButton
                    size="small"
                    aria-label={open ? t('deliveryNotesHide') : t('deliveryNotesShow')}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
            </Box>
            <Collapse in={open}>
                <Table size="small" sx={{ mt: 0.5, maxWidth: 520 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('deliveryNoteNumber')}</TableCell>
                            <TableCell>{t('receptionDate')}</TableCell>
                            <TableCell align="right">{t('quantity')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {notes.map((note) => (
                            <TableRow key={`${rowKey}-dn-${note.id ?? note.receivedAt}`}>
                                <TableCell>{note.deliveryNoteNumber || '—'}</TableCell>
                                <TableCell>{formatDeliveryNoteDate(note.receivedAt)}</TableCell>
                                <TableCell align="right">{note.quantity ?? '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Collapse>
        </Box>
    );
}
