import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
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
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import {
    canAccessCentralAdminMaterialProviders,
    filterDecimalNumericInput,
    parseDecimalNumericInputToNumber,
    readLoggedUser,
    Server,
} from 'sf-common';
import type { ApplicationUserTO, MaterialTO } from 'sf-common/src/models/ApiRequests';
import { toastActionError } from '../../util/actionToast';

type QueryLineDraft = {
    materialName: string;
    materialCode: string;
    quantity: string;
};

function newLineDraft(): QueryLineDraft {
    return { materialName: '', materialCode: '', quantity: '' };
}

function userLabel(user: ApplicationUserTO): string {
    const name = [user.name, user.surname].filter(Boolean).join(' ').trim();
    const email = user.email?.trim();
    if (name && email) return `${name} (${email})`;
    return name || email || String(user.id ?? '');
}

function userKey(user: ApplicationUserTO): string {
    return String(user.id ?? user.email ?? `${user.name}-${user.surname}-${user.qrCode}`);
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildPlainTextTable(
    lines: Array<{ materialCode: string; materialName: string; quantity: string }>,
    headers: { code: string; name: string; quantity: string },
): string {
    const rows = [
        [headers.code, headers.name, headers.quantity],
        ...lines.map((line) => [line.materialCode || '—', line.materialName, line.quantity]),
    ];
    const widths = [0, 1, 2].map((col) => Math.max(...rows.map((row) => row[col].length)));
    return rows
        .map((row) => row.map((cell, i) => cell.padEnd(widths[i], ' ')).join('  |  '))
        .join('\n');
}

type Props = {
    open: boolean;
    materials: MaterialTO[];
    onClose: () => void;
};

export function MaterialProviderQueryDialog({ open, materials, onClose }: Props) {
    const { t } = useTranslation();
    const loggedUser = readLoggedUser();
    const [contactPerson, setContactPerson] = useState('');
    const [providerEmail, setProviderEmail] = useState('');
    const [ccUsers, setCcUsers] = useState<ApplicationUserTO[]>([]);
    const [eligibleUsers, setEligibleUsers] = useState<ApplicationUserTO[]>([]);
    const [lines, setLines] = useState<QueryLineDraft[]>([newLineDraft()]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const materialNameOptions = useMemo(() => {
        const names = materials
            .map((material) => material.name?.trim())
            .filter((name): name is string => Boolean(name));
        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    }, [materials]);

    const materialsByName = useMemo(() => {
        const map = new Map<string, MaterialTO>();
        for (const material of materials) {
            const name = material.name?.trim();
            if (!name) continue;
            const key = name.toLocaleLowerCase();
            if (!map.has(key)) {
                map.set(key, material);
            }
        }
        return map;
    }, [materials]);

    useEffect(() => {
        if (!open) return;
        setContactPerson('');
        setProviderEmail('');
        setLines([newLineDraft()]);
        setLoadingUsers(true);
        Server.getAllUsers(
            (response: { data?: ApplicationUserTO[] | { data?: ApplicationUserTO[] } }) => {
                let data: ApplicationUserTO[] = [];
                if (Array.isArray(response?.data)) data = response.data;
                else if (Array.isArray(response?.data?.data)) data = response.data.data;
                const eligible = data.filter(
                    (user) =>
                        canAccessCentralAdminMaterialProviders(user)
                        && Boolean(user.email?.trim())
                        && isValidEmail(user.email ?? ''),
                );
                setEligibleUsers(eligible);
                setCcUsers(eligible);
                setLoadingUsers(false);
            },
            () => {
                setEligibleUsers([]);
                setCcUsers([]);
                setLoadingUsers(false);
            },
        );
    }, [open]);

    const updateLine = (index: number, patch: Partial<QueryLineDraft>) => {
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    };

    const setMaterialNameOnLine = (index: number, materialName: string) => {
        const match = materialsByName.get(materialName.trim().toLocaleLowerCase());
        updateLine(index, {
            materialName,
            materialCode: match?.code?.trim() || '',
        });
    };

    const canSubmit =
        contactPerson.trim().length > 0
        && isValidEmail(providerEmail)
        && lines.length > 0
        && lines.every((line) => {
            const quantity = parseDecimalNumericInputToNumber(line.quantity);
            return line.materialName.trim().length > 0 && quantity != null && quantity > 0;
        });

    const handleSubmit = () => {
        if (!canSubmit) {
            toastActionError(t('materialProviderQueryValidationError'));
            return;
        }

        const senderName = [loggedUser?.name, loggedUser?.surname].filter(Boolean).join(' ').trim()
            || t('notLoggedIn');
        const tableLines = lines.map((line) => ({
            materialCode: line.materialCode.trim() || '—',
            materialName: line.materialName.trim(),
            quantity: String(parseDecimalNumericInputToNumber(line.quantity)),
        }));
        const table = buildPlainTextTable(tableLines, {
            code: t('materialCodeInternal'),
            name: t('materialName'),
            quantity: t('quantity'),
        });
        const body = [
            t('materialProviderQueryGreeting', { contactPerson: contactPerson.trim() }),
            '',
            t('materialProviderQueryBodyIntro'),
            '',
            table,
            '',
            t('materialProviderQueryClosing', { fullName: senderName }),
        ].join('\n');

        const cc = ccUsers
            .map((user) => user.email?.trim())
            .filter((email): email is string => Boolean(email))
            .join(',');

        const params = [
            `subject=${encodeURIComponent(t('materialProviderQuerySubject'))}`,
            `body=${encodeURIComponent(body)}`,
        ];
        if (cc) {
            params.push(`cc=${encodeURIComponent(cc)}`);
        }

        window.location.href = `mailto:${encodeURIComponent(providerEmail.trim())}?${params.join('&')}`;
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('sendMaterialQueryToNewProvider')}
                <IconButton size="small" onClick={onClose} aria-label={t('close')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label={t('providerContactPerson')}
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        size="small"
                        fullWidth
                        required
                    />
                    <TextField
                        label={t('providerEmailAddress')}
                        type="email"
                        value={providerEmail}
                        onChange={(e) => setProviderEmail(e.target.value)}
                        size="small"
                        fullWidth
                        required
                    />
                    <Autocomplete
                        multiple
                        options={eligibleUsers}
                        value={ccUsers}
                        loading={loadingUsers}
                        getOptionLabel={userLabel}
                        isOptionEqualToValue={(a, b) => userKey(a) === userKey(b)}
                        onChange={(_e, value) => setCcUsers(value)}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return <Chip key={key} label={userLabel(option)} size="small" {...tagProps} />;
                            })
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t('materialProviderQueryCcUsers')}
                                size="small"
                                helperText={t('materialProviderQueryCcUsersHint')}
                            />
                        )}
                    />

                    <Typography variant="subtitle2">{t('materialProviderQueryItems')}</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('materialName')}</TableCell>
                                    <TableCell width={140}>{t('quantity')}</TableCell>
                                    <TableCell width={56} align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lines.map((line, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Autocomplete
                                                freeSolo
                                                options={materialNameOptions}
                                                value={line.materialName}
                                                onInputChange={(_e, value) => setMaterialNameOnLine(index, value)}
                                                onChange={(_e, value) =>
                                                    setMaterialNameOnLine(
                                                        index,
                                                        typeof value === 'string' ? value : value ?? '',
                                                    )
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size="small"
                                                        placeholder={t('materialName')}
                                                    />
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={line.quantity}
                                                inputMode="decimal"
                                                onChange={(e) =>
                                                    updateLine(index, {
                                                        quantity: filterDecimalNumericInput(e.target.value),
                                                    })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                disabled={lines.length <= 1}
                                                onClick={() =>
                                                    setLines((prev) => prev.filter((_, i) => i !== index))
                                                }
                                                aria-label={t('delete')}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => setLines((prev) => [...prev, newLineDraft()])}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {t('materialProviderQueryAddItem')}
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                            {t('materialProviderQueryOpenMailto')}
                        </Button>
                        <Button variant="outlined" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
