import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { ContextProvider } from "./context/context";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Blogs } from "./pages/Blogs";
import { BlogDetail } from "./pages/BlogDetail";
import { Contact } from "./pages/Contact";

export const Router = () => {
  console.log("Router.jsx");
  const router = createBrowserRouter([
    {
      path: "/",
      element:<ContextProvider>  <App /> </ContextProvider>,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: "/about",
          element: <About />,
        },
        {
          path: "/blogs",
          element: <Blogs />,
        },
        {
          path: "/blogs/:slug",
          element: <BlogDetail />,
        },
        {
          path: "/contact",
          element: <Contact />,
        },
      ],
    },
  ]);

  return  <RouterProvider router={router} /> ;
};
