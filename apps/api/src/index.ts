import express from "express";
import missionRouter from "./routes/mission.routes";

const app = express();
app.use(express.json());
app.use("/missions", missionRouter);

app.listen(8080, () => {
  console.log("Connected to server");
});
