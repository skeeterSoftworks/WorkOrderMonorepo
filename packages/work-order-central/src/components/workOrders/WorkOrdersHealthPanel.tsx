import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
    MachineBookingTO,
    MachineTO,
    ProductOrderTO,
    PurchaseOrderTO,
    WorkOrderTO,
} from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';

function unwrapArray<T>(response: unknown): T[] {
    const r = response as { data?: T[] | { data?: T[] } };
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
}

function getAllWorkOrdersAsync(): Promise<WorkOrderTO[]> {
    return new Promise((resolve, reject) => {
        Server.getAllWorkOrders(
            (response: unknown) => resolve(unwrapArray(response)),
            () => reject(new Error('workOrders')),
        );
    });
}

function getAllPurchaseOrdersAsync(): Promise<PurchaseOrderTO[]> {
    return new Promise((resolve, reject) => {
        Server.getAllPurchaseOrders(
            (response: unknown) => resolve(unwrapArray(response)),
            () => reject(new Error('purchaseOrders')),
        );
    });
}

function getAllMachinesAsync(): Promise<MachineTO[]> {
    return new Promise((resolve, reject) => {
        Server.getAllMachines(
            (response: unknown) => resolve(unwrapArray(response)),
            () => reject(new Error('machines')),
        );
    });
}

function getMachineBookingsForWorkOrderAsync(workOrderId: number): Promise<MachineBookingTO[]> {
    return new Promise((resolve, reject) => {
        Server.getMachineBookingsForWorkOrder(
            workOrderId,
            (response: unknown) => resolve(unwrapArray(response)),
            () => reject(new Error('bookings')),
        );
    });
}

function getMachineBookingsForMachineAsync(
    machineId: number,
    fromIso: string,
    toIso: string,
): Promise<MachineBookingTO[]> {
    return new Promise((resolve, reject) => {
        Server.getMachineBookingsForMachine(
            machineId,
            fromIso,
            toIso,
            (response: unknown) => resolve(unwrapArray(response)),
            () => reject(new Error('machineBookings')),
        );
    });
}

function startOfLocalDay(d = new Date()): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfLocalDayAfterDays(days: number): Date {
    const x = startOfLocalDay();
    x.setDate(x.getDate() + days);
    x.setHours(23, 59, 59, 999);
    return x;
}

function todayYyyyMmDd(): string {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function dueDateYyyyMmDd(wo: WorkOrderTO): string | null {
    if (!wo.dueDate || wo.dueDate.length < 10) return null;
    return wo.dueDate.substring(0, 10);
}

function bookingOverlapsRange(booking: MachineBookingTO, rangeStart: Date, rangeEnd: Date): boolean {
    if (!booking.startDateTime || !booking.endDateTime) return false;
    const bs = new Date(booking.startDateTime).getTime();
    const be = new Date(booking.endDateTime).getTime();
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    return bs <= re && be >= rs;
}

function isActiveProductionBooking(booking: MachineBookingTO): boolean {
    return booking.type === 'PRODUCTION' && booking.status !== 'CANCELLED';
}

function workOrderHasProductionBooking(bookings: MachineBookingTO[]): boolean {
    return bookings.some(isActiveProductionBooking);
}

function machineHasProductionInRange(
    bookings: MachineBookingTO[],
    rangeStart: Date,
    rangeEnd: Date,
): boolean {
    return bookings.some(
        (b) => isActiveProductionBooking(b) && bookingOverlapsRange(b, rangeStart, rangeEnd),
    );
}

function workOrderLabel(wo: WorkOrderTO): string {
    return wo.productReference?.trim() || wo.productName?.trim() || `#${wo.id ?? '?'}`;
}

function machineLabel(m: MachineTO): string {
    return m.machineName?.trim() || `#${m.id ?? '?'}`;
}

function productOrderLabel(po: PurchaseOrderTO, line: ProductOrderTO): string {
    const productLabel = line.product?.reference?.trim() || line.product?.name?.trim() || `#${line.id ?? '?'}`;
    return `PO #${po.id ?? '?'} - ${productLabel}`;
}

export function WorkOrdersHealthPanel() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [workOrdersWithoutBooking, setWorkOrdersWithoutBooking] = useState(0);
    const [workOrdersWithoutBookingLabels, setWorkOrdersWithoutBookingLabels] = useState<string[]>([]);
    const [machinesIdleNextWeek, setMachinesIdleNextWeek] = useState(0);
    const [machinesIdleLabels, setMachinesIdleLabels] = useState<string[]>([]);
    const [overdueIncomplete, setOverdueIncomplete] = useState(0);
    const [overdueLabels, setOverdueLabels] = useState<string[]>([]);
    const [productOrdersWithoutWorkOrder, setProductOrdersWithoutWorkOrder] = useState(0);
    const [productOrdersWithoutWorkOrderLabels, setProductOrdersWithoutWorkOrderLabels] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [workOrders, purchaseOrders, machines] = await Promise.all([
                    getAllWorkOrdersAsync(),
                    getAllPurchaseOrdersAsync(),
                    getAllMachinesAsync(),
                ]);
                if (cancelled) return;

                const assignedProductOrderIds = new Set<number>(
                    workOrders
                        .map((wo) => wo.productOrderId)
                        .filter((id): id is number => id != null && Number.isFinite(id)),
                );
                const productOrdersWithoutWoLabels: string[] = [];
                for (const po of purchaseOrders) {
                    for (const line of po.productOrderList ?? []) {
                        if (line.id == null || !Number.isFinite(line.id)) {
                            continue;
                        }
                        if (!assignedProductOrderIds.has(line.id)) {
                            productOrdersWithoutWoLabels.push(productOrderLabel(po, line));
                        }
                    }
                }
                setProductOrdersWithoutWorkOrder(productOrdersWithoutWoLabels.length);
                setProductOrdersWithoutWorkOrderLabels(productOrdersWithoutWoLabels);

                const today = todayYyyyMmDd();
                const overdueList = workOrders.filter(
                    (wo) => wo.state !== 'COMPLETE' && dueDateYyyyMmDd(wo) != null && dueDateYyyyMmDd(wo)! < today,
                );
                setOverdueIncomplete(overdueList.length);
                setOverdueLabels(overdueList.map(workOrderLabel));

                const incompleteWithId = workOrders.filter((wo) => wo.state !== 'COMPLETE' && wo.id != null);

                const woBookingResults = await Promise.allSettled(
                    incompleteWithId.map((wo) => getMachineBookingsForWorkOrderAsync(Number(wo.id))),
                );
                if (cancelled) return;

                const missingBookingLabels: string[] = [];
                incompleteWithId.forEach((wo, i) => {
                    const r = woBookingResults[i];
                    if (r.status !== 'fulfilled') return;
                    if (!workOrderHasProductionBooking(r.value)) {
                        missingBookingLabels.push(workOrderLabel(wo));
                    }
                });
                setWorkOrdersWithoutBooking(missingBookingLabels.length);
                setWorkOrdersWithoutBookingLabels(missingBookingLabels);

                const rangeStart = startOfLocalDay();
                const rangeEnd = endOfLocalDayAfterDays(7);
                const fromIso = rangeStart.toISOString();
                const toIso = rangeEnd.toISOString();

                const machineIds = machines.filter((m) => m.id != null).map((m) => Number(m.id));

                const machineBookingResults = await Promise.allSettled(
                    machineIds.map((id) => getMachineBookingsForMachineAsync(id, fromIso, toIso)),
                );
                if (cancelled) return;

                const idleMachineLabels: string[] = [];
                machineIds.forEach((id, i) => {
                    const m = machines.find((x) => x.id === id);
                    if (!m) return;
                    const r = machineBookingResults[i];
                    if (r.status !== 'fulfilled') return;
                    if (!machineHasProductionInRange(r.value, rangeStart, rangeEnd)) {
                        idleMachineLabels.push(machineLabel(m));
                    }
                });
                setMachinesIdleNextWeek(idleMachineLabels.length);
                setMachinesIdleLabels(idleMachineLabels);
            } catch {
                if (!cancelled) setError(t('operationsHealthLoadError'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [t]);

    const listTooltip = (items: string[]) =>
        items.length > 0 ? (
            <Box sx={{ maxWidth: 380 }}>
                {items.slice(0, 12).map((item, idx) => (
                    <Typography key={`${item}-${idx}`} variant="caption" component="div">
                        - {item}
                    </Typography>
                ))}
                {items.length > 12 && (
                    <Typography variant="caption" component="div">
                        ... +{items.length - 12} more
                    </Typography>
                )}
            </Box>
        ) : (
            t('none')
        );

    const healthRow = (label: string, count: number, items: string[], subtle?: boolean) => {
        const semanticColor = subtle
            ? 'text.secondary'
            : count > 0
              ? 'error.dark'
              : 'success.main';
        const content = (
            <Typography
                variant="body2"
                component="span"
                color={semanticColor}
                sx={{ display: 'inline-block' }}
            >
                {label}: {count}
            </Typography>
        );
        if (count <= 0) return <Box>{content}</Box>;
        return (
            <Tooltip
                title={listTooltip(items)}
                arrow
                placement="right-start"
                slotProps={{
                    popper: {
                        modifiers: [
                            { name: 'flip', enabled: false },
                            { name: 'preventOverflow', options: { padding: 8, altAxis: false } },
                        ],
                    },
                }}
            >
                {content}
            </Tooltip>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="warning" sx={{ mt: 1 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">{t('operationsHealth')}</Typography>
            <Stack spacing={0.5} sx={{ mt: 1, alignItems: 'flex-start' }}>
                {healthRow(
                    t('healthProductOrdersWithoutAssignedWorkOrders'),
                    productOrdersWithoutWorkOrder,
                    productOrdersWithoutWorkOrderLabels,
                )}
                {healthRow(
                    t('healthWorkOrdersWithoutProductionBooking'),
                    workOrdersWithoutBooking,
                    workOrdersWithoutBookingLabels,
                )}
                {healthRow(
                    t('healthMachinesIdleProductionNextWeek'),
                    machinesIdleNextWeek,
                    machinesIdleLabels,
                )}
                {healthRow(t('healthIncompleteWorkOrdersOverdue'), overdueIncomplete, overdueLabels)}
            </Stack>
        </Paper>
    );
}
