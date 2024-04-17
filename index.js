const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

require("dotenv").config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get("/car", async function(req, res) {
  const { id } = req.params;
  try {
    console.log("/cars");
    const [cars] = await req.db.query(
      `SELECT * FROM car WHERE deleted_flag = 0;`,
      {
        id,
      },
    );
    res.json({ cars });
  } catch (err) { }
});

app.use(async function(req, res, next) {
  try {
    console.log("Middleware after the get /cars");

    await next();
  } catch (err) { }
});

app.post("/car", async function(req, res) {
  try {
    const { make, model, year } = req.body;

    const query = await req.db.query(
      `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
      {
        make,
        model,
        year,
      },
    );

    res.json({
      success: true,
      message: "Car successfully created",
      data: null,
    });
  } catch (err) {
    res.json({ success: false, message: err, data: null });
  }
});

app.delete("/car/:id", async function(req, res) {
  try {
    console.log("req.params /car/:id", req.params);

    res.json("success");
  } catch (err) { }
});

app.put("/car/:id", async function(req, res) {
  const { id } = req.params;
  const { make, model, year, deleted_flag } = req.body;

  const updates = [];
  const data = {};

  data.id = id;
  if (make !== undefined) {
    updates.push(`make = :make`);
    data.make = make;
  }
  if (model !== undefined) {
    updates.push(`model = :model`);
    data.model = model;
  }
  if (year !== undefined) {
    updates.push(`year = :year`);
    data.year = year;
  }
  if (deleted_flag !== undefined) {
    updates.push(`deleted_flag = :deleted_flag`);
    data.deleted_flag = deleted_flag;
  }

  if (updates.length === 0) {
    return res.status(400).send("No valid fields provided for updates");
  }

  const query = `UPDATE car SET ${updates.join(", ")} WHERE id = :id;`;

  try {
    const [result] = await req.db.query(query, data);

    if (result.affectedRows === 0) {
      return res.status(404).send("Car not found");
    }

    res.json({...data, success: true});
  } catch (err) { 
    console.error("Failed to update car:", err);
    res.status(500).send("Error updating car");
  }
});

app.listen(port, () =>
  console.log(`212 API Example listening on http://localhost:${port}`),
);
