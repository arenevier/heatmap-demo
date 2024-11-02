import 'dotenv/config'
import Koa from 'koa';
import serve from 'koa-static';
import Router from 'koa-router';
import pg from 'pg'
import sharp from 'sharp';

import { HeatmapProducer, StravaLocalZip, PostgisDB } from 'activities-heatmap';

const MAIN_PORT = process.env.PORT ? parseInt(process.env.PORT) : 7000;

function paramToInt(params: Record<string, string>, key: string): number | null {
  const value = parseInt(params[key]);
  if (!Number.isInteger(value)) {
    return null;
  }
  if (value.toString() !== params[key]) {
    return null;
  }
  return value;
}

const ACTIVITIES_TABLE_NAME = 'activities';

async function main() {
  const app = new Koa();
  const mainRouter = new Router();

  const pg_client = new pg.Client({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
  });
  await pg_client.connect();

  // Activities are stored in a PostGIS table. The table must follow the schema described in https://github.com/arenevier/activities-heatmap/blob/main/src/datasource/PostgisDB.ts
  const dataSource = new PostgisDB(pg_client, ACTIVITIES_TABLE_NAME);
  await dataSource.init();

  //  if you want to use strava bulk export instead, you can use the following code (assuming the zip file in named "export_23048086.zip")
  //  const stravaExportZipFile = path.join(path.dirname(__filename), "..", "export_23048086.zip");
  //  const dataSource = new StravaLocalZip(stravaExportZipFile);
  //  await dataSource.init();

  const heatmapProducer = new HeatmapProducer(dataSource);

  mainRouter.get('/heatmap/:z/:x/:y.png', async (ctx, _next) => {
    const x = paramToInt(ctx.params, 'x');
    if (x === null) {
      ctx.response.status = 400;
      return
    }
    const y = paramToInt(ctx.params, 'y');
    if (y === null) {
      ctx.response.status = 400;
      return
    }
    const z = paramToInt(ctx.params, 'z');
    if (z === null) {
      ctx.response.status = 400;
      return
    }

    try {
      const start = performance.now();
      const bitmap = await heatmapProducer.BitmapForTile({ x, y, z });
      console.info('time spent for tile', performance.now() - start);
      const png = sharp(bitmap, { raw: { width: 256, height: 256, channels: 4 } }).png();
      ctx.response.body = await png.toBuffer();
      ctx.response.status = 200;
      ctx.response.type = 'png';
    } catch (e) {
      ctx.response.body = (e as Error).message;
      ctx.response.status = 500;
    }
  });

  app.use(serve("html"));
  app.use(mainRouter.routes());
  app.listen(MAIN_PORT);
}

main();
