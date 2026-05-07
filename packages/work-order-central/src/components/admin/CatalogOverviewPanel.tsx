import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import type { CustomerTO, MachineTO, MaterialTO, MaterialProviderTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';

type CatalogSectionId = 'products' | 'buyers' | 'machines' | 'materials' | 'providers';

function providersOf(material: MaterialTO): MaterialProviderTO[] {
    if (Array.isArray(material.providers)) return material.providers;
    return material.provider ? [material.provider] : [];
}

function providerKey(provider: MaterialProviderTO): string {
    if (provider.id != null) return `id:${provider.id}`;
    return `name:${(provider.name ?? '').trim().toLowerCase()}`;
}

export function CatalogOverviewPanel({ onOpenSection }: { onOpenSection: (section: CatalogSectionId) => void }) {
    const { t } = useTranslation();
    const [products, setProducts] = useState<ProductTO[]>([]);
    const [buyers, setBuyers] = useState<CustomerTO[]>([]);
    const [machines, setMachines] = useState<MachineTO[]>([]);
    const [providers, setProviders] = useState<MaterialProviderTO[]>([]);

    useEffect(() => {
        Server.getAllProducts(
            (response: any) => {
                const data = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
                setProducts(data);
            },
            () => {},
        );
        Server.getAllCustomers(
            (response: any) => {
                const data = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
                setBuyers(data);
            },
            () => {},
        );
        Server.getAllMachines(
            (response: any) => {
                const data = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
                setMachines(data);
            },
            () => {},
        );
        Server.getAllMaterialProviders(
            (response: any) => {
                const data = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
                setProviders(data);
            },
            () => {},
        );
    }, []);

    const {
        productsWithoutProviders,
        productsWithoutMeasuringFeatures,
        productsWithoutQualitySteps,
        unlinkedBuyers,
        unlinkedMachines,
    } = useMemo(() => {
        const byMaterial = new Map<string, MaterialTO>();
        let withoutProviders = 0;
        let withoutMeasuringFeatures = 0;
        let withoutQualitySteps = 0;
        const linkedCustomerIds = new Set<number>();
        const linkedMachineIds = new Set<number>();
        for (const p of products) {
            if ((p.materialProviderIds?.length ?? 0) === 0) withoutProviders += 1;
            if ((p.measuringFeaturePrototypes?.length ?? 0) === 0) withoutMeasuringFeatures += 1;
            if ((p.qualityInfoSteps?.length ?? 0) === 0) withoutQualitySteps += 1;
            for (const cid of p.customerIds ?? []) {
                if (typeof cid === 'number' && Number.isFinite(cid)) linkedCustomerIds.add(cid);
            }
            for (const mid of p.machineIds ?? []) {
                if (typeof mid === 'number' && Number.isFinite(mid)) linkedMachineIds.add(mid);
            }
            for (const m of p.materials ?? []) {
                const key = m.id != null ? `id:${m.id}` : `code:${m.code ?? ''}|name:${m.name ?? ''}`;
                if (!byMaterial.has(key)) byMaterial.set(key, m);
            }
        }
        const buyersWithoutProducts = buyers.filter((b) => b.id != null && !linkedCustomerIds.has(Number(b.id))).length;
        const machinesWithoutProducts = machines.filter((m) => m.id != null && !linkedMachineIds.has(Number(m.id))).length;
        return {
            productsWithoutProviders: withoutProviders,
            productsWithoutMeasuringFeatures: withoutMeasuringFeatures,
            productsWithoutQualitySteps: withoutQualitySteps,
            unlinkedBuyers: buyersWithoutProducts,
            unlinkedMachines: machinesWithoutProducts,
        };
    }, [products, buyers, machines]);

    const providersWithoutMaterials = useMemo(() => {
        const providersLinkedToAnyMaterial = new Set<string>();
        for (const p of products) {
            for (const m of p.materials ?? []) {
                for (const provider of providersOf(m)) {
                    providersLinkedToAnyMaterial.add(providerKey(provider));
                }
            }
        }
        return providers.filter((p) => !providersLinkedToAnyMaterial.has(providerKey(p))).length;
    }, [products, providers]);

    const machinesWithoutImages = useMemo(
        () => machines.filter((m: any) => !m.machineImageBase64?.trim()).length,
        [machines],
    );

    const affected = useMemo(() => {
        const productsNoProviders: string[] = [];
        const productsNoMeasuring: string[] = [];
        const productsNoQuality: string[] = [];
        for (const p of products) {
            const label = p.name || p.reference || `#${p.id ?? '?'}`;
            if ((p.materialProviderIds?.length ?? 0) === 0) productsNoProviders.push(label);
            if ((p.measuringFeaturePrototypes?.length ?? 0) === 0) productsNoMeasuring.push(label);
            if ((p.qualityInfoSteps?.length ?? 0) === 0) productsNoQuality.push(label);
        }

        const linkedCustomerIds = new Set<number>();
        const linkedMachineIds = new Set<number>();
        for (const p of products) {
            for (const cid of p.customerIds ?? []) {
                if (typeof cid === 'number' && Number.isFinite(cid)) linkedCustomerIds.add(cid);
            }
            for (const mid of p.machineIds ?? []) {
                if (typeof mid === 'number' && Number.isFinite(mid)) linkedMachineIds.add(mid);
            }
        }
        const customersNoProducts = buyers
            .filter((b) => b.id != null && !linkedCustomerIds.has(Number(b.id)))
            .map((b) => b.companyName || `#${b.id ?? '?'}`);

        const machinesNoProducts = machines
            .filter((m) => m.id != null && !linkedMachineIds.has(Number(m.id)))
            .map((m) => m.machineName || `#${m.id ?? '?'}`);

        const providersLinkedToAnyMaterial = new Set<string>();
        for (const p of products) {
            for (const m of p.materials ?? []) {
                for (const provider of providersOf(m)) {
                    providersLinkedToAnyMaterial.add(providerKey(provider));
                }
            }
        }
        const providersNoMaterials = providers
            .filter((p) => !providersLinkedToAnyMaterial.has(providerKey(p)))
            .map((p) => p.name || p.contactPerson || `#${p.id ?? '?'}`);

        const machinesNoImages = machines
            .filter((m: any) => !m.machineImageBase64?.trim())
            .map((m) => m.machineName || `#${m.id ?? '?'}`);

        return {
            productsNoProviders,
            productsNoMeasuring,
            productsNoQuality,
            customersNoProducts,
            machinesNoProducts,
            providersNoMaterials,
            machinesNoImages,
        };
    }, [products, buyers, machines, providers]);

    const listTooltip = (items: string[]) => (
        items.length > 0
            ? (
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
            )
            : t('none')
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

    const cards = [
        { label: t('products'), value: products.length, section: 'products' as const },
        { label: t('buyers'), value: buyers.length, section: 'buyers' as const },
        { label: t('machines'), value: machines.length, section: 'machines' as const },
        { label: t('materialProviders'), value: providers.length, section: 'providers' as const },
    ];

    return (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">{t('catalogOverview')}</Typography>

            <Grid container spacing={2}>
                {cards.map((card) => (
                    <Grid key={card.section} item xs={12} sm={6} md={4} lg={3}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" sx={{ mt: 1 }}>{card.value}</Typography>
                            <Button size="small" sx={{ mt: 1, px: 0 }} onClick={() => onOpenSection(card.section)}>
                                {t('openSection')}
                            </Button>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1">{t('catalogHealth')}</Typography>
                <Stack spacing={0.5} sx={{ mt: 1, alignItems: 'flex-start' }}>
                    {healthRow(t('healthProductsWithoutProviders'), productsWithoutProviders, affected.productsNoProviders)}
                    {healthRow(t('healthProductsWithoutMeasuringFeatures'), productsWithoutMeasuringFeatures, affected.productsNoMeasuring)}
                    {healthRow(t('healthProductsWithoutQualitySteps'), productsWithoutQualitySteps, affected.productsNoQuality)}
                    {healthRow(t('healthCustomersWithoutProducts'), unlinkedBuyers, affected.customersNoProducts)}
                    {healthRow(t('healthMachinesWithoutProducts'), unlinkedMachines, affected.machinesNoProducts)}
                    {healthRow(t('healthProvidersWithoutMaterials'), providersWithoutMaterials, affected.providersNoMaterials)}
                    {healthRow(t('healthMachinesWithoutImages'), machinesWithoutImages, affected.machinesNoImages, true)}
                </Stack>
            </Paper>
        </Box>
    );
}
