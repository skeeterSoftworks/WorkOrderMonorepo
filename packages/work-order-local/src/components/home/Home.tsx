import {Button, Grid} from '@mui/material'
import type {LoggedUser} from "../../models/Common.ts";
import {useTranslation} from "react-i18next";


export function Home() {

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)
    const { t } = useTranslation()


    const homeButtonStyle: any = {
        height: "18vh",
        width: "18vh",
        borderRadius: "20px",
        textTransform: "none",
        fontSize: "1.1rem",
        fontWeight: 600,
        boxShadow: 4,
    }

    return (

        <Grid container sx={{ minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
            {userData && userData.role === "ADMIN" &&
                <Grid container spacing={3} sx={{ maxWidth: 1100, justifyContent: "center" }}>

                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs="auto" sx={{ textAlign: "center" }}>
                            <Button href="/production" variant="contained" sx={homeButtonStyle}>
                                {t("production")}
                            </Button>
                        </Grid>}
                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs="auto" sx={{ textAlign: "center" }}>
                            <Button href="/information-management" variant="contained" sx={homeButtonStyle}>
                                {t("informationManagement")}
                            </Button>
                        </Grid>}

                </Grid>}
        </Grid>

    )
}
