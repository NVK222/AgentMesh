import express from "express";
import missionRouter from "./routes/mission.routes";
import errorHandler from "./middleware/error.middleware";

const app = express();
app.use(express.json());

app.use("/missions", missionRouter);

app.use(errorHandler);

app.listen(8080, () => {
    console.log("Connected to server");
});
