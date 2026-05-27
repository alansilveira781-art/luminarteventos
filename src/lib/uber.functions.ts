import { createServerFn } from "@tanstack/react-start";
import { getUberAccessToken } from "./uber/auth.server";

export type UberTrip = {
  trip_uuid: string;
  request_time: string; // ISO
  fare?: number;
  currency_code?: string;
  product_type?: string;
  employee?: { name?: string; email?: string };
  expense_code?: string | null;
  expense_memo?: string | null;
  start_address?: string | null;
  end_address?: string | null;
  city?: string | null;
  distance?: number;
  duration?: number;
};

type ApiTrip = {
  trip_uuid?: string;
  uuid?: string;
  request_time?: string;
  requested_at?: string;
  fare?: number | string;
  cost_total?: number | string;
  currency_code?: string;
  product_type?: string;
  vehicle_type?: string;
  expense_code?: string | null;
  expense_memo?: string | null;
  start_address?: string | null;
  end_address?: string | null;
  pickup?: { address?: string };
  dropoff?: { address?: string };
  employee?: { name?: string; email?: string };
  rider?: { name?: string; email?: string };
  city?: string;
  distance?: number;
  duration?: number;
};

function normalize(t: ApiTrip): UberTrip {
  return {
    trip_uuid: t.trip_uuid ?? t.uuid ?? crypto.randomUUID(),
    request_time: t.request_time ?? t.requested_at ?? new Date().toISOString(),
    fare: Number(t.fare ?? t.cost_total ?? 0) || 0,
    currency_code: t.currency_code ?? "BRL",
    product_type: t.product_type ?? t.vehicle_type ?? "—",
    employee: t.employee ?? t.rider ?? {},
    expense_code: t.expense_code ?? null,
    expense_memo: t.expense_memo ?? null,
    start_address: t.start_address ?? t.pickup?.address ?? null,
    end_address: t.end_address ?? t.dropoff?.address ?? null,
    city: t.city ?? null,
    distance: Number(t.distance ?? 0) || 0,
    duration: Number(t.duration ?? 0) || 0,
  };
}

export const getUberTrips = createServerFn({ method: "POST" })
  .inputValidator((input: { from: string; to: string }) => input)
  .handler(async ({ data }): Promise<{ trips: UberTrip[]; error: string | null }> => {
    try {
      const orgUuid = process.env.UBER_ORG_UUID;
      if (!orgUuid) {
        return { trips: [], error: "UBER_ORG_UUID não configurado" };
      }

      const token = await getUberAccessToken();
      const fromMs = new Date(data.from + "T00:00:00Z").getTime();
      const toMs = new Date(data.to + "T23:59:59Z").getTime();

      const trips: UberTrip[] = [];
      let offset = 0;
      const limit = 50;
      let safety = 0;

      while (safety < 200) {
        safety++;
        const url = new URL(`https://api.uber.com/v1/business/trips`);
        url.searchParams.set("org_uuid", orgUuid);
        url.searchParams.set("start_time", String(fromMs));
        url.searchParams.set("end_time", String(toMs));
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Accept-Language": "pt-BR",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 403) {
            return {
              trips,
              error:
                "App Uber não tem o escopo 'business.trips' aprovado. Solicite o escopo no painel developer.uber.com.",
            };
          }
          return { trips, error: `Erro Uber (${res.status}): ${text.slice(0, 200)}` };
        }

        const json = (await res.json()) as { trips?: ApiTrip[]; count?: number };
        const batch = json.trips ?? [];
        trips.push(...batch.map(normalize));

        if (batch.length < limit) break;
        offset += limit;
      }

      return { trips, error: null };
    } catch (e) {
      console.error("getUberTrips error", e);
      return { trips: [], error: (e as Error).message };
    }
  });
