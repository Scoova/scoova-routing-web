/**
 * @scoova/routing — Client for the Scoova routing gateway
 * (`api.scoo-va.info/api/v1/routing`).
 *
 * Eight endpoints: route, optimizedRoute, isochrone, matrix, height
 * (alias `elevation`), mapMatch, locate, status. Plus polyline6 decoding so
 * apps can render returned shapes without pulling a separate dependency.
 *
 * Same surface as the Android, iOS, Flutter, and RN routing clients.
 */

export interface LatLng { lat: number; lon: number; }

export type CostingType =
  | 'auto'
  | 'bicycle'
  | 'scooter'
  | 'pedestrian'
  | 'truck'
  | 'motorcycle'
  | 'motor_scooter';

export type Units = 'kilometers' | 'miles';

export interface RouteOptions {
  costing?: CostingType;
  /** Per-call language override (sent as `directions_options.language`). */
  language?: string;
  /** Per-call locale override (sent as the `?locale=` query param and the
   *  `Accept-Language` header). Falls back to the client-level `locale`. */
  locale?: string;
  units?: Units;
  alternates?: number;
  simplifiedInstructions?: boolean;
}

export interface IsochroneContour {
  /** Time in minutes. */
  time?: number;
  /** Distance in km. */
  distance?: number;
}

export interface IsochroneOptions {
  contours: IsochroneContour[];
  costing?: CostingType;
  polygons?: boolean;
  /** Per-call locale override. */
  locale?: string;
}

/**
 * Server-rendered maneuver-kind tag from the routing API `scoova` block.
 * Locale-independent — same on every SDK.
 */
export type ScoovaKind =
  | 'right' | 'left' | 'uturn'
  | 'roundabout' | 'exit-roundabout'
  | 'merge'
  | 'ramp-right' | 'ramp-left' | 'ramp-straight'
  | 'exit-right' | 'exit-left'
  | 'keep-right' | 'keep-left'
  | 'depart' | 'arrive' | 'arrive-right' | 'arrive-left'
  | 'continue' | 'ferry';

/** Visual banner copy rendered server-side. */
export interface ScoovaBanner {
  verb: string;
  anchor?: string | null;
  kind?: ScoovaKind | null;
}

/** Voice copy rendered server-side for each cue phase. */
export interface ScoovaVoice {
  headsUp?: string | null;
  turnNow?: string | null;
  atLandmark?: string | null;
  /** Template with `{secs}` placeholder. */
  getReadyTemplate?: string | null;
  /** Template with `{meters}` placeholder. */
  atDistanceTemplate?: string | null;
}

/** Server-rendered scoova block attached to a maneuver. */
export interface ManeuverScoova {
  kind: ScoovaKind;
  exit?: number | null;
  lang: string;
  landmark?: string | null;
  banner: ScoovaBanner;
  voice: ScoovaVoice;
}

/** Trip-level server-rendered state copy (welcome / wrongWay / …). */
export interface TripScoova {
  lang: string;
  dir: 'ltr' | 'rtl';
  state: {
    welcome?: string | null;
    good?: string | null;
    keepGoing?: string | null;
    keepGoingMeters?: string | null;
    almostThere?: string | null;
    almostThereRight?: string | null;
    almostThereLeft?: string | null;
    arrived?: string | null;
    wrongWay?: string | null;
    missedTurn?: string | null;
    rerouting?: string | null;
    slowDown?: string | null;
  };
}

export interface Maneuver {
  type: number;
  instruction: string;
  begin_shape_index: number;
  end_shape_index: number;
  length: number;
  time: number;
  street_names?: string[];
  roundabout_exit_count?: number;
  verbal_pre_transition_instruction?: string;
  verbal_post_transition_instruction?: string;
  /** Server-rendered scoova block — see `ManeuverScoova`. Optional. */
  scoova?: ManeuverScoova | null;
}

export interface RouteSummary { length: number; time: number; }

export interface RouteLeg {
  shape: string;
  summary: RouteSummary;
  maneuvers: Maneuver[];
}

export interface RouteTrip {
  legs: RouteLeg[];
  summary: RouteSummary;
  status: number;
  status_message: string;
  units: string;
  language?: string;
  /** Trip-level server-rendered scoova block — see `TripScoova`. Optional. */
  scoova?: TripScoova | null;
}

export interface RouteResult { trip: RouteTrip; }

export class RoutingError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'RoutingError';
  }
}

const DEFAULT_BASE = 'https://api.scoo-va.info/api/v1/routing';
const DEFAULT_LOCALE = 'en';

export interface ClientOptions {
  baseUrl?: string;
  defaultCosting?: CostingType;
  fetch?: typeof fetch;
  /**
   * Default locale for every request. Sent as the `?locale=` query parameter
   * AND the `Accept-Language` header. Per-call `options.locale` overrides
   * this. Default: `'en'`.
   *
   * Accepted: `en`, `en-US`, `en-GB`, `en-CA`, `fr`, `es`, `de`, `it`,
   * `pt-BR`, `nl`, `ar`, `ar-EG`, `ar-SA`, `ar-LB`, `ar-MA`, plus regional
   * variants. Unsupported codes fall back to `en` server-side.
   */
  locale?: string;
  /** Optional gateway API key. Sent as the `X-API-Key` header on every
   *  request when set. Required by the central gateway at
   *  `api.scoo-va.info/api/v1/routing/*` (the default `baseUrl`). */
  apiKey?: string;
}

export class RoutingClient {
  private baseUrl: string;
  private defaultCosting: CostingType;
  private fetchImpl: typeof fetch;
  private locale: string;
  private apiKey?: string;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.defaultCosting = opts.defaultCosting ?? 'scooter';
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.locale = opts.locale ?? DEFAULT_LOCALE;
    this.apiKey = opts.apiKey;
  }

  async route(locations: LatLng[], options: RouteOptions = {}): Promise<RouteResult> {
    const body: Record<string, unknown> = {
      locations,
      costing: options.costing ?? this.defaultCosting,
      directions_options: {
        units: options.units ?? 'kilometers',
        language: options.language ?? this.localeFor(options),
      },
    };
    if (options.simplifiedInstructions) body.simplified_instructions = true;
    if (options.alternates !== undefined) body.alternates = options.alternates;
    return this.post('/route', body, options.locale);
  }

  async optimizedRoute(locations: LatLng[], options: RouteOptions = {}): Promise<RouteResult> {
    return this.post('/optimized_route', {
      locations,
      costing: options.costing ?? this.defaultCosting,
      directions_options: {
        units: options.units ?? 'kilometers',
        language: options.language ?? this.localeFor(options),
      },
    }, options.locale);
  }

  async isochrone(location: LatLng, options: IsochroneOptions): Promise<unknown> {
    return this.post('/isochrone', {
      locations: [location],
      costing: options.costing ?? this.defaultCosting,
      contours: options.contours,
      polygons: options.polygons ?? true,
    }, options.locale);
  }

  async matrix(sources: LatLng[], targets: LatLng[], costing: CostingType = 'scooter'): Promise<unknown> {
    return this.post('/sources_to_targets', { sources, targets, costing });
  }

  async height(shape: LatLng[], range = true): Promise<unknown> {
    return this.post('/height', { shape, range });
  }

  /** Alias for `height()` — matches the unified SDK naming. */
  async elevation(shape: LatLng[], range = true): Promise<unknown> {
    return this.height(shape, range);
  }

  async mapMatch(shape: LatLng[], costing: CostingType = 'scooter'): Promise<RouteResult> {
    return this.post('/trace_route', { shape, costing, shape_match: 'map_snap' });
  }

  async locate(locations: LatLng[], costing: CostingType = 'scooter'): Promise<unknown> {
    return this.post('/locate', { locations, costing });
  }

  async status(): Promise<unknown> {
    const res = await this.fetchImpl(this.urlFor('/status'), {
      headers: this.headers(),
    });
    if (!res.ok) throw new RoutingError(await res.text(), res.status);
    return res.json();
  }

  // ─── internals ────────────────────────────────────────────────────────

  private localeFor(options: { locale?: string }): string {
    return options.locale ?? this.locale;
  }

  private urlFor(path: string, perCallLocale?: string): string {
    const locale = perCallLocale ?? this.locale;
    const sep = path.includes('?') ? '&' : '?';
    return `${this.baseUrl}${path}${sep}locale=${encodeURIComponent(locale)}`;
  }

  private headers(perCallLocale?: string, extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': perCallLocale ?? this.locale,
      ...extra,
    };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  private async post<T = any>(path: string, body: unknown, perCallLocale?: string): Promise<T> {
    const res = await this.fetchImpl(this.urlFor(path, perCallLocale), {
      method: 'POST',
      headers: this.headers(perCallLocale, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new RoutingError(text.slice(0, 200), res.status);
    try { return JSON.parse(text) as T; }
    catch (e) { throw new RoutingError(`Invalid JSON from ${path}: ${(e as Error).message}`); }
  }
}

/** Decode a polyline (precision 6, Google-format) string into `{lat, lon}` points. */
export function decodePolyline(encoded: string, precision = 6): LatLng[] {
  const coords: LatLng[] = [];
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ lat: lat / factor, lon: lon / factor });
  }
  return coords;
}
