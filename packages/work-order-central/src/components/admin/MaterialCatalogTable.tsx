import { memo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { MaterialProviderTO, MaterialTO } from 'sf-common/src/models/ApiRequests';
import { TableActionsRow, tableActionsTableCellSx, tableActionIconButtonSx } from '../shared/tableActions';

function materialProvidersOf(m: MaterialTO): MaterialProviderTO[] {
    if (Array.isArray(m.providers)) return m.providers;
    return m.provider ? [m.provider] : [];
}

type Row = { m: MaterialTO; idx: number };

type Props = {
    rows: Row[];
    onEdit: (idx: number) => void;
    onRemove: (idx: number) => void;
};

export const MaterialCatalogTable = memo(function MaterialCatalogTable({ rows, onEdit, onRemove }: Props) {
    const { t } = useTranslation();

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>{t('materialName')}</TableCell>
                    <TableCell>{t('materialCode')}</TableCell>
                    <TableCell>{t('materialProviderName')}</TableCell>
                    <TableCell align="right" sx={tableActionsTableCellSx}>{t('actions')}</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.length > 0 ? rows.map(({ m, idx }) => (
                    <TableRow key={m.id ?? `${m.code}-${idx}`}>
                        <TableCell>{m.name ?? '—'}</TableCell>
                        <TableCell>{m.code ?? '—'}</TableCell>
                        <TableCell>{materialProvidersOf(m).map((p) => p.name || p.contactPerson).filter(Boolean).join(', ') || '—'}</TableCell>
                        <TableCell align="right" sx={tableActionsTableCellSx}>
                            <TableActionsRow>
                                <IconButton size="small" sx={tableActionIconButtonSx.edit} onClick={() => onEdit(idx)} title={t('edit')}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" sx={tableActionIconButtonSx.delete} onClick={() => onRemove(idx)} title={t('remove')}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableActionsRow>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">{t('materialsEmpty')}</Typography>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
});
