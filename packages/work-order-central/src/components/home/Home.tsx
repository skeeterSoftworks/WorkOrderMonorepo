import {Button, Grid} from '@mui/material'
import type {LoggedUser} from "../../models/Common.ts";
import {useTranslation} from "react-i18next";


export function Home() {

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)
    const { t } = useTranslation()


    const homeButtonMarginStyle: any = {
        height: "20vh",
        width: "20vh",
        borderRadius: "18px",

    }

    return (

        <Grid container sx={{ marginTop: "30vh" }}>
            {userData && userData.role === "ADMIN" &&
                <Grid container>

                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={3} md={3} sx={{ textAlign: "center" }}>
                            <Button href="/purchase-orders" variant="contained" sx={homeButtonMarginStyle}>
                                {t("purchaseOrders")}
                            </Button>
                        </Grid>}
                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={3} md={3} sx={{ textAlign: "center" }}>
                            <Button href="/work-orders" variant="contained" sx={homeButtonMarginStyle}>
                                {t("workOrders")}
                            </Button>
                        </Grid>}
                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={3} md={3} sx={{ textAlign: "center" }}>
                            <Button href="/production" variant="contained" sx={homeButtonMarginStyle}>
                                {t("production")}
                            </Button>
                        </Grid>}
                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={3} md={3} sx={{ textAlign: "center" }}>
                            <Button href="/stock" variant="contained" sx={homeButtonMarginStyle}>
                                {t("stock")}
                            </Button>
                        </Grid>}
                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={3} md={3} sx={{ textAlign: "center" }}>
                            <Button href="/admin" variant="contained" sx={homeButtonMarginStyle}>
                                {t("admin")}
                            </Button>
                        </Grid>}

                </Grid>}
        </Grid>

    )
}
