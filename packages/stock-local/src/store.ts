import { configureStore } from '@reduxjs/toolkit';
import {reducer} from "./reducers/Reducer"
export const store = configureStore({
  reducer: {
    applicationStore: reducer,
  },
});