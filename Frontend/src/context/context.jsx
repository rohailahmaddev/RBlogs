import { createContext, useMemo, useState } from "react";
import usePostFilters from "../components/hooks/UserPostFilter";
import { useBlogs } from "../components/hooks/useBlogs";

export const Data = createContext(null);

export const ContextProvider = ({ children}) => {

  const filters = usePostFilters();
  const endPoint = `/posts/get-posts`
  const { data, loading, error, refetch } = useBlogs({ url:endPoint, params:filters.apiParams })

  const DEMO_TITLE = "Why I stopped chasing the perfect draft";
  const COVER_TONES = [
  "bg-blue-600",
  "bg-blue-800",
  "bg-slate-800",
  "bg-sky-600",
  "bg-indigo-700",
  ];
  
  const values = useMemo(() => ({
      data,
      loading,
      error,
      refetch,
      COVER_TONES,
      DEMO_TITLE,
  }),[data, loading, error, refetch ])

  return <Data.Provider value={values}>{children}</Data.Provider>;
};
