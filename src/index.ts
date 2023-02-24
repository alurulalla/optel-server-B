import {
  initInstrumentation,
  createSpan,
  createMySpan,
} from '@metronetinc/node-express-opentelemetry-package/src/index';
import express, { Express, Request, Response } from 'express';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import api from '@opentelemetry/api';
import httpContext from 'express-http-context';
import winston from 'winston';

const zipkinSpanExporter = new ZipkinExporter({
  url: 'http://localhost:9411/api/v2/spans',
  serviceName: process.env.npm_package_name,
});

initInstrumentation(undefined, zipkinSpanExporter);

const PORT: number = parseInt(process.env.PORT || '8081');
const app: Express = express();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

logger.add(new winston.transports.Console({ level: 'info' }));

const tracer = api.trace.getTracer(process.env.npm_package_name as string);

app.get('/another', (_req: Request, res: Response) => {
  const remoteContext = api.propagation.extract(
    api.context.active(),
    _req.headers
  );
  const span = api.trace
    .getTracer(process.env.npm_package_name as string)
    .startSpan('another-span-from-server-b', {}, remoteContext);

  logger.info({
    message: 'another-span-from-server-b',
    traceID: span.spanContext().traceId,
  });
  span.end();
  res.send([{ name: 'prod1', price: 9 }]);
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
