import { useEffect, useState } from "react";
import { getBlogPosts } from "../../api/blogServices";
import { useCallback } from "react";


export const useBlogs = (params) => {
    const [state, setState] = useState({data:null,error:null,loading:true});
    const [reloadCount, setReloadCount] = useState(0)

    const key = JSON.stringify(params)
    useEffect(()=>{
        const controller = new AbortController();//browser api to abort req
        setState((s) => ({...s, error:null, loading:true}));

        getBlogPosts(JSON.parse(key),{signal:controller.signal})
        .then((data) =>( setState({data:data, error:null, loading:false})))
        .catch((error) => {
            console.log(error)
            if(error?.name === "AbortError") return; // replaced by a newer request
            setState((s) =>({...s, error:error?.name, loading:false}));
        })

        return () => controller.abort();
    }, [key, reloadCount])

    console.log("3")
    const refetch = useCallback(() => setReloadCount((n) => (n+1)),[]);

    return {...state,refetch}
}
