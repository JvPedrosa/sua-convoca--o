import sqlite3 from "sqlite3";
import { playersSeed } from "./playersSeed.js";

const DB_PATH = "./server/data/players.db";

export function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (openErr) => {
      if (openErr) {
        reject(openErr);
      }
    });

    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          team TEXT NOT NULL,
          position TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
      );

      db.get("SELECT COUNT(*) AS total FROM players", (countErr, row) => {
        if (countErr) {
          reject(countErr);
          return;
        }

        if (row.total === 0) {
          const insert = db.prepare(
            "INSERT INTO players (name, team, position) VALUES (?, ?, ?)",
          );

          playersSeed.forEach((player) => {
            insert.run(player.name, player.team, player.position);
          });

          insert.finalize();
        }

        resolve(db);
      });
    });
  });
}

export function listPlayers(db, search = "") {
  return new Promise((resolve, reject) => {
    const sanitizedSearch = `%${search.trim().toLowerCase()}%`;
    const hasSearch = search.trim().length > 0;

    const query = hasSearch
      ? `
        SELECT id, name, team, position
        FROM players
        WHERE LOWER(name) LIKE ? OR LOWER(team) LIKE ? OR LOWER(position) LIKE ?
        ORDER BY name ASC
      `
      : `
        SELECT id, name, team, position
        FROM players
        ORDER BY name ASC
      `;

    const params = hasSearch
      ? [sanitizedSearch, sanitizedSearch, sanitizedSearch]
      : [];

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}
