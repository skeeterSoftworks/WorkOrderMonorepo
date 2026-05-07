import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import type { CustomerTO, MachineTO, MaterialTO, MaterialProviderTO, ProductTO } from 'sf-common/src/models/ApiRequests';
import { Server } from 'sf-common';

type CatalogSectionId = 'products' | 'buyers' | 'machines' | 'materials' | 'providers';

function providersOf(material: MaterialTO): MaterialProviderTO[] {
    if (Array.isArray(material.providers)) return material.providers;
    return material.provider ? [material.provider] : [];
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

    const {  productsWithoutProviders } = useMemo(() => {
        const byMaterial = new Map<string, MaterialTO>();
        let withoutProviders = 0;
        for (const p of products) {
            if ((p.materialProviderIds?.length ?? 0) === 0) withoutProviders += 1;
            for (const m of p.materials ?? []) {
                const key = m.id != null ? `id:${m.id}` : `code:${m.code ?? ''}|name:${m.name ?? ''}`;
                if (!byMaterial.has(key)) byMaterial.set(key, m);
            }
        }
        return {
            productsWithoutProviders: withoutProviders,
        };
    }, [products]);

    const materialsWithoutProviders = useMemo(() => {
        let count = 0;
        const seen = new Set<string>();
        for (const p of products) {
            for (const m of p.materials ?? []) {
                const key = m.id != null ? `id:${m.id}` : `code:${m.code ?? ''}|name:${m.name ?? ''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                if (providersOf(m).length === 0) count += 1;
            }
        }
        return count;
    }, [products]);

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
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    <Typography variant="body2">{t('productsWithoutProviders')}: {productsWithoutProviders}</Typography>
                    <Typography variant="body2">{t('materialsWithoutProviders')}: {materialsWithoutProviders}</Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
