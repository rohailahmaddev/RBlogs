import api from "./apiClient.js"

export const getBlogPosts = async (url,{ search, category, author, page, limit } ={},options={}) =>{
    const res = await api.get(`${url}`,{
        params:{category, author, page, limit, search },
        signal:options.signal
    })
    return res.data.data
}

export const getBlogCategories = async(options={}) => {
    const res = await api.get("/posts/categories",{
        signal:options.signal
    })

    return res.data.data;
}