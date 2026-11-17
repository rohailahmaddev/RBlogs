import { useEffect, useState } from "react";
import { getBlogCategories } from "../../api/blogServices";
import { useCallback } from "react";


export const useCategory = () => {
    const [state, setState] = useState({cdata:null});
    // const [reloadCount, setReloadCount] = useState(0)

    useEffect(()=>{
        const controller = new AbortController();//browser api to abort req
        setState((s) => ({...s}));

        getBlogCategories({signal:controller.signal})
        .then((data) =>( setState({cdata:data})))
        .catch((error) => {
            if(error?.name === "AbortError") return; // replaced by a newer request
            setState((s) =>({...s}));
        })

        return () => controller.abort();
    }, [])

    // const refetch = useCallback(() => setReloadCount((n) => (n+1)),[]);

    return {...state}
}
