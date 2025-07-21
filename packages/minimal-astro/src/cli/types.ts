/**
 * Shared types for CLI commands
 */

export interface BuildOptions {
  readonly root?: string;
  readonly outDir?: string;
}

export interface DevOptions {
  readonly root?: string;
  readonly port?: number;
  readonly host?: string;
  readonly open?: boolean;
}

export interface Route {
  readonly pattern: string;
  readonly component: string;
  readonly pathname?: string;
  readonly params: readonly string[];
}

export interface RouteManifest {
  readonly routes: readonly Route[];
}
