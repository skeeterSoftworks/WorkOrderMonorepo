import { Grid } from "@mui/material";
import { Field } from "react-final-form";
import React from "react";
import {useTranslation} from "react-i18next";


interface Props {
    label: string,
    fieldName: string,
    size?: number,
    selectOptions: string[],
    disabled?: boolean,
    multiple?: boolean,
    dropdownWidth?: string
}

export function DropdownFieldStyled(props: Props) {

    const { t } = useTranslation()

    let selectOptions: JSX.Element[] = []

    selectOptions.push(<option></option>)

    for (const sOption of props.selectOptions) {

        selectOptions.push(<option key={sOption} label={t(sOption)}>{sOption}</option>)
    }

    return (
        <Grid item xs={props.size || 4} sx={{ display: "grid", width: "100%" }} >
            <label style={{ textAlign: "left" }}>{props.label}</label>
            <Field name={props.fieldName} component="select" multiple={props.multiple}
                   style={{ width: props.dropdownWidth || "60%"}} disabled={props.disabled} >
                {selectOptions}
            </Field>
        </Grid>
    )
}
