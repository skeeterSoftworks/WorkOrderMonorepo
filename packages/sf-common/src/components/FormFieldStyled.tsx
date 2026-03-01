import { Grid } from "@mui/material";
import { Field } from "react-final-form";
import React from "react";


interface Props {
    label: string,
    fieldName: string,
    size?: number,
    onChange?: Function,
    disabled?: boolean
}

export function FormFieldStyled(props: Props) {

    return (
        <Grid item xs={props.size || 4} sx={{ display: "grid" }} >
            <label style={{ textAlign: "left" }}>{props.label}</label>
            <Field name={props.fieldName} component="input" style={{ width: "60%" }} disabled={props.disabled} />
        </Grid>
    )
}