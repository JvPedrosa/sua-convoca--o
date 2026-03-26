import cors from "cors";
import express from "express";
import { initDatabase, listPlayers } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = await initDatabase();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "convocacao-api" });
});

app.get("/api/players", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const rows = await listPlayers(db, search);

    const players = rows.map((row) => ({
      id: `db-${row.id}`,
      name: row.name,
      team: row.team,
      position: row.position,
      thumb: "",
      updatedAt: "",
    }));

    res.json({
      source: "sqlite",
      total: players.length,
      players,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      message: "Falha ao carregar jogadores no banco de dados.",
      detail: error instanceof Error ? error.message : "erro-desconhecido",
    });
  }
});

app.listen(PORT, () => {
  console.log(`API de convocacao rodando em http://localhost:${PORT}`);
});
