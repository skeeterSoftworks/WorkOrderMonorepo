import {CSSProperties} from "react";

export const inputStyles = {
    marginBottom: 4,
    label: {
        marginRight: 5
    },
    input: {
        float: "right"
    }
}

export const centerHorizontal: any = {
    textAlign: "center",
    marginLeft: "auto",
    marginRight: "auto"
}

export const spaceEvenly: any = {
    justifyContent: "space-evenly",
        alignItems: "center",
}

export const accordionLabel: any = {
    ...centerHorizontal,
    color: "white"
}

export const paddedLabel: any = {
    padding: 4, paddingLeft: 10
}

export const paddedContainer: any = {
    padding: "2%"
}

export const header: any = {
    ...paddedLabel,
    borderBottom: "3px solid #E8F5E9"
}

export const red: any = {
    color: "red"
}

export const green: any = {
    color: "green"
}

export const purple: any = {
    color: "purple"
}

export const productPillVo: any = {
    margin: "4px",
    borderRadius: "22px",
    border: "2px solid black",
    paddingLeft: "10px",
    paddingRight: "10px"
}

export const mockQrFragment: any = {
    minHeight: "252px",
    width: "300px",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center"
}

export const mockScanContent: any = {
    minHeight: "100px",
    width: "300px",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "4vh",
    textAlign: "center"
}

const Background = {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundImage: `../public/streit-nova.png`,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
};

export const radioButtonContainer = {
    marginLeft: "20%"
}

export const bold = {
    fontWeight: 900
}

export const justifyCenter: CSSProperties = {
    justifyContent: "center",
    alignItems: "center",
}

export const justifyRight: CSSProperties = {
    justifyContent: "flex-end",
    alignItems: "center",
}

export const justifyLeft: CSSProperties = {
    justifyContent: "flex-start",
    alignItems: "center",
}


