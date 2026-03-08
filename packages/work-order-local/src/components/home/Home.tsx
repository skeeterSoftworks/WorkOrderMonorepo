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
                        <Grid item xs={4} md={4} sx={{ textAlign: "center" }}>
                            <Button href="/work-orders-local" variant="contained" sx={homeButtonMarginStyle}>
                                {t("workOrders")}
                            </Button>
                        </Grid>}

                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={4} md={4} sx={{ textAlign: "center" }}>
                            <Button href="/mock-qr" variant="contained" sx={homeButtonMarginStyle}>
                                MOCK Qr Panel
                            </Button>
                        </Grid>}

                </Grid>}
        </Grid>

    )
}
