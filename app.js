import express from "express";
import authRoutes from "./routes/auth.routes.js";
import searchRoutes from "./routes/search.routes.js";
import userRoutes from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerDocs from "./swagger.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { morganMiddleware } from "./middlewares/morgan.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";

const app = express();

app.use(morganMiddleware);
app.use(helmet());
app.use(rateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(globalErrorHandler);

export default app;
