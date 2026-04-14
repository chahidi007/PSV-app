import { Router, type Request, type Response } from "express";
import { readFileSync, statSync } from "fs";
import { join } from "path";

const router = Router();

const DATA_PATH = join(process.cwd(), "data", "phyto_index.json");

router.get("/phyto-index", (_req: Request, res: Response) => {
  try {
    const stat = statSync(DATA_PATH);
    const data = readFileSync(DATA_PATH, "utf-8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Last-Modified", stat.mtime.toUTCString());
    res.setHeader("X-Data-Updated", stat.mtime.toISOString());
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: "Index not available" });
  }
});

export default router;
