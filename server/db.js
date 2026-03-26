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

      db.run(
        `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name_team
        ON players(name, team)
      `,
      );

      const upsert = db.prepare(
        `
        INSERT INTO players (name, team, position)
        VALUES (?, ?, ?)
        ON CONFLICT(name, team)
        DO UPDATE SET position = excluded.position
      `,
      );

      playersSeed.forEach((player) => {
        upsert.run(player.name, player.team, player.position);
      });

      upsert.finalize((finalizeErr) => {
        if (finalizeErr) {
          reject(finalizeErr);
          return;
        }

        const seedKeys = new Set(playersSeed.map((p) => `${p.name}|${p.team}`));

        db.all("SELECT id, name, team FROM players", (selectErr, rows) => {
          if (selectErr) {
            reject(selectErr);
            return;
          }

          const staleRows = rows.filter(
            (row) => !seedKeys.has(`${row.name}|${row.team}`),
          );

          if (!staleRows.length) {
            resolve(db);
            return;
          }

          const remove = db.prepare("DELETE FROM players WHERE id = ?");
          staleRows.forEach((row) => remove.run(row.id));

          remove.finalize((removeErr) => {
            if (removeErr) {
              reject(removeErr);
              return;
            }

            resolve(db);
          });
        });
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
        ORDER BY
          CASE
            WHEN LOWER(position) LIKE '%goalkeeper%' OR LOWER(position) LIKE '%goleiro%' THEN 1
            WHEN LOWER(position) LIKE '%defender%' OR LOWER(position) LIKE '%defensor%' OR LOWER(position) LIKE '%zagueiro%' OR LOWER(position) LIKE '%lateral%' THEN 2
            WHEN LOWER(position) LIKE '%midfielder%' OR LOWER(position) LIKE '%meia%' OR LOWER(position) LIKE '%volante%' THEN 3
            WHEN LOWER(position) LIKE '%forward%' OR LOWER(position) LIKE '%atacante%' OR LOWER(position) LIKE '%ponta%' OR LOWER(position) LIKE '%centroavante%' THEN 4
            ELSE 5
          END ASC,
          name ASC
      `
      : `
        SELECT id, name, team, position
        FROM players
        ORDER BY
          CASE
            WHEN LOWER(position) LIKE '%goalkeeper%' OR LOWER(position) LIKE '%goleiro%' THEN 1
            WHEN LOWER(position) LIKE '%defender%' OR LOWER(position) LIKE '%defensor%' OR LOWER(position) LIKE '%zagueiro%' OR LOWER(position) LIKE '%lateral%' THEN 2
            WHEN LOWER(position) LIKE '%midfielder%' OR LOWER(position) LIKE '%meia%' OR LOWER(position) LIKE '%volante%' THEN 3
            WHEN LOWER(position) LIKE '%forward%' OR LOWER(position) LIKE '%atacante%' OR LOWER(position) LIKE '%ponta%' OR LOWER(position) LIKE '%centroavante%' THEN 4
            ELSE 5
          END ASC,
          name ASC
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
