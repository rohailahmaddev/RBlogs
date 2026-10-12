import express from "express";
import cors from "cors"
import cookieParser from 'cookie-parser'

const app = express()

//cors configrations
app.use(cors({
  origin: [
    'https://portfolio-d2402.web.app',
    'https://selfown-3603e.web.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}))
app.use(express.json());
app.use(cookieParser())

//API

import router from "./routes/index.route.js"
import { errorHandler } from "./middleware/errorHandler.middleware.js";

app.use("/api/v1/user", router)

app.use(errorHandler)
export default app;