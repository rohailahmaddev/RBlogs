import { createContext, useState } from "react";

export const Data = createContext(null);

export const ContextProvider = ({ children }) => {

  const DEMO_TITLE = "Why I stopped chasing the perfect draft";
  const COVER_TONES = [
  "bg-blue-600",
  "bg-blue-800",
  "bg-slate-800",
  "bg-sky-600",
  "bg-indigo-700",
];

  const contextData = {
    DEMO_TITLE,
    COVER_TONES,
  };

  return <Data.Provider value={contextData}>{children}</Data.Provider>;
};