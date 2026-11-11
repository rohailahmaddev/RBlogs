export const getBlogPosts = async ({ search, category, author, page, limit } ={},options={}) =>{
    const res = await api.get("/posts/get-posts",{
        params:{category, author, page, limit, search },
        signal:options.signal
    })

    console.log(res)
    return res.data
}