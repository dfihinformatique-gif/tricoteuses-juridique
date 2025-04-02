import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
// import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { resourceFromAttributes } from "@opentelemetry/resources"
// import {
//   PeriodicExportingMetricReader,
//   ConsoleMetricExporter,
// } from "@opentelemetry/sdk-metrics"
import { NodeSDK } from "@opentelemetry/sdk-node"
// import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node"
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions"

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],

  // metricReader: new PeriodicExportingMetricReader({
  //   exporter: new ConsoleMetricExporter(),
  // }),

  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "@tricoteuses/legifrance",
    // [ATTR_SERVICE_NAMESPACE]: "Tricoteuses",
    // [ SEMRESATTRS_SERVICE_VERSION ]: "1.0",
    // [ SEMRESATTRS_SERVICE_INSTANCE_ID ]: "my-instance-id-1",
  }),

  // traceExporter: new ConsoleSpanExporter(),
  traceExporter: new OTLPTraceExporter({
    // Jaeger OTLP endpoint
    // Use http://jaeger:4318/v1/traces if using Docker Compose
    // Or use http://localhost:4318/v1/traces for local Jaeger instance
    url: "https://jaeger-4318.tricoteuses.fr/v1/traces",
    // headers: {}, // You can add custom headers if needed
  }),
})

sdk.start()

// gracefully shut down the SDK on process exit
process.on("SIGTERM", async () => {
  await sdk.shutdown()
})
