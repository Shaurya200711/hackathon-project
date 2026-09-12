require("dotenv").config();

const express = require("express");
const cors = require("cors");

const aiRoutes = require("./routes/ai");
const groupingRoutes = require("./routes/grouping");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "TabFlow backend is running"
    });
});

app.use("/api", aiRoutes);
app.use("/api", groupingRoutes);

app.listen(PORT, () => {
    console.log(`TabFlow backend listening on http://localhost:${PORT}`);
});