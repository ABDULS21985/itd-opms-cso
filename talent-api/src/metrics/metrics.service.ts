import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  // Counters
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestErrors: client.Counter<string>;

  // Business metrics
  readonly candidateProfilesCreated: client.Counter<string>;
  readonly introRequestsCreated: client.Counter<string>;
  readonly placementsCreated: client.Counter<string>;
  readonly csvImportsProcessed: client.Counter<string>;
  readonly emailsSent: client.Counter<string>;

  // Gauges
  readonly activeCandidates: client.Gauge<string>;
  readonly activeEmployers: client.Gauge<string>;
  readonly pendingIntroRequests: client.Gauge<string>;

  constructor() {
    this.register = new client.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      app: 'talent-api',
    });

    // HTTP metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    this.httpRequestErrors = new client.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors (4xx and 5xx)',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Business counters
    this.candidateProfilesCreated = new client.Counter({
      name: 'talent_candidate_profiles_created_total',
      help: 'Total number of candidate profiles created',
      registers: [this.register],
    });

    this.introRequestsCreated = new client.Counter({
      name: 'talent_intro_requests_created_total',
      help: 'Total number of intro requests created',
      registers: [this.register],
    });

    this.placementsCreated = new client.Counter({
      name: 'talent_placements_created_total',
      help: 'Total number of placements created',
      registers: [this.register],
    });

    this.csvImportsProcessed = new client.Counter({
      name: 'talent_csv_imports_processed_total',
      help: 'Total number of CSV import operations processed',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.emailsSent = new client.Counter({
      name: 'talent_emails_sent_total',
      help: 'Total number of emails sent',
      labelNames: ['template'],
      registers: [this.register],
    });

    // Gauges
    this.activeCandidates = new client.Gauge({
      name: 'talent_active_candidates',
      help: 'Current number of active (approved) candidates',
      registers: [this.register],
    });

    this.activeEmployers = new client.Gauge({
      name: 'talent_active_employers',
      help: 'Current number of verified employers',
      registers: [this.register],
    });

    this.pendingIntroRequests = new client.Gauge({
      name: 'talent_pending_intro_requests',
      help: 'Current number of pending intro requests',
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Collect default Node.js metrics (CPU, memory, event loop, etc.)
    client.collectDefaultMetrics({ register: this.register });
  }

  /**
   * Returns the metrics in Prometheus text exposition format.
   * Suitable for serving on a /metrics endpoint.
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Returns the content type header for Prometheus metrics.
   */
  getContentType(): string {
    return this.register.contentType;
  }

  /**
   * Record an HTTP request with its duration and status.
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc(labels);
    }
  }
}
