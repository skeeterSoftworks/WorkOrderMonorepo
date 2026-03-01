import { Grid } from "@mui/material";
import { Field } from "react-final-form";
import React from "react";


interface Props {
    label: string,
    fieldName: string,
    size?: number
}

export function CheckboxStyled(props: Props) {

    return (
        <Grid item xs={props.size || 3} md={props.size || 3} lg={props.size || 3}  style={{ marginTop: "2%" }}>
            <label style={{ paddingRight: "2%" }}>{props.label}</label>
            <Field name={props.fieldName} component="input" type="checkbox" />
        </Grid>
    )
}