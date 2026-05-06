import {Box, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";

export function PurchasingPage() {
    const { t } = useTranslation();

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5">{t("purchasing")}</Typography>
        </Box>
    );
}
