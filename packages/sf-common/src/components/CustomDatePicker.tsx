import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid, format, parse } from "date-fns";
import { enGB } from "date-fns/locale";

const DATE_DISPLAY = "dd/MM/yy";

function parseFormDate(value: string): Date | null {
    if (!value?.trim()) {
        return null;
    }
    const v = value.trim();
    const eu2 = parse(v, "dd/MM/yy", new Date(), { locale: enGB });
    if (isValid(eu2)) {
        return eu2;
    }
    const eu4 = parse(v, "dd/MM/yyyy", new Date(), { locale: enGB });
    if (isValid(eu4)) {
        return eu4;
    }
    // Legacy US strings from older clients
    const us = parse(v, "MM/dd/yyyy", new Date());
    if (isValid(us)) {
        return us;
    }
    const iso = new Date(v);
    return isValid(iso) ? iso : null;
}

export const CustomDatePicker = ({ name, input, input: { value, onChange } }) => {
    let selected: Date | null = null;

    if (value) {
        selected = parseFormDate(String(value));
    }
    return (
        <DatePicker
            placeholderText={
                selected ? format(selected, DATE_DISPLAY) : "Enter date"
            }
            dateFormat={DATE_DISPLAY}
            selected={selected}
            disabledKeyboardNavigation
            name={name}
            onChange={(date) => {
                if (isValid(date)) {
                    input.onChange(format(new Date(date), DATE_DISPLAY));
                } else {
                    input.onChange(null);
                }
            }}
        />
    );
};
