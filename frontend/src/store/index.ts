import { configureStore } from "@reduxjs/toolkit";

/** Shared application state will be added module-by-module. */
export const store = configureStore({ reducer: {} });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
