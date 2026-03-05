import {Button, Grid} from '@mui/material'
import type {LoggedUser} from "../../models/Common.ts";


export function Home() {

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)

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
                            <Button href="/admin-central" variant="contained" sx={homeButtonMarginStyle}>
                                Admin Central
                            </Button>
                        </Grid>}

                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={4} md={4} sx={{ textAlign: "center" }}>
                            <Button href="/mock-qr" variant="contained" sx={homeButtonMarginStyle}>
                                MOCK Qr Panel
                            </Button>
                        </Grid>}

                    {userData && userData.role === "ADMIN" &&
                        <Grid item xs={4} md={4} sx={{ textAlign: "center" }}>
                            <Button href="/stations-monitoring" variant="contained" sx={homeButtonMarginStyle}>
                                Stations monitoring
                            </Button>
                        </Grid>}
                </Grid>}
        </Grid>

    )
}
