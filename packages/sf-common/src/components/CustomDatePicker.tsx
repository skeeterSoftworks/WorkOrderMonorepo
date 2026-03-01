import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid, toDate, format, parse } from "date-fns"
import { enUS } from "date-fns/locale";
import React from "react";

export const CustomDatePicker = ({ name, input, input: { value, onChange } }) => {
  let isValidDate = false;
  let selected: Date | null = null;

  if (value) {
    const parsedDate = parse(value, "P", new Date(), { locale: enUS });
    isValidDate = isValid(parsedDate);
    selected = isValidDate ? toDate(parsedDate) : null;
  }
  return (
    <DatePicker
      placeholderText={
        value ? format(new Date(value), "MM/dd/yyyy") : "Enter date"
      }
      dateFormat="MM/dd/yyyy"
      selected={selected} // needs to be checked if it is valid date
      disabledKeyboardNavigation
      name={name}
      onChange={(date) => {
        // On Change, you should use final-form Field Input prop to change the value
        if (isValid(date)) {
          input.onChange(format(new Date(date), "MM/dd/yyyy"));
        } else {
          input.onChange(null);
        }
      }}
    />
  );
};