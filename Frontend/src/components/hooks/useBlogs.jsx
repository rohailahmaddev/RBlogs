import { useEffect, useState, useCallback } from "react";
import { getBlogPosts } from "../../api/blogServices";
import axios from "axios";

export const useBlogs = ({ url, params = {} }) => {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });

  const [reloadCount, setReloadCount] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({
      data: null,
      error: null,
      loading: true,
    });

    getBlogPosts(url, JSON.parse(key), {
      signal: controller.signal,
    })
      .then((data) => {
        if (active) {
          setState({
            data,
            error: null,
            loading: false,
          });
        }
      })
      .catch((error) => {
        if (
          !active ||
          axios.isCancel(error) ||
          error?.name === "AbortError" ||
          error?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setState({
          data: null,
          error: error?.message ?? "Request failed",
          loading: false,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, reloadCount, url]);

  const refetch = useCallback(() => {
    setReloadCount((n) => n + 1);
  }, []);

  return { ...state, refetch };
};