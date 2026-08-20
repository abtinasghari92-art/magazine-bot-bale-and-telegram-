"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { seasonLabel } from "@/lib/dates";
import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { ArchiveResponse, CatalogFacetsDto, IssueSummaryDto } from "@/lib/miniapp/dto";

import { IssueGridCard } from "./catalog";
import { Alert, Button, Card, Muted, Spinner, TextInput } from "./ui";

/**
 * Archive (REQ-012 / REQ-013).
 *
 * Search and filters are applied **server-side** against indexed columns, and
 * results arrive one cursor page at a time — the whole catalog is never fetched
 * to be filtered in the browser. The active query lives in the URL so a reader
 * can share or reopen the exact view they were on.
 */

type Filters = {
  q: string;
  year: string;
  season: string;
  topic: string;
};

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get("q") ?? "",
    year: params.get("year") ?? "",
    season: params.get("season") ?? "",
    topic: params.get("topic") ?? "",
  };
}

function toQueryString(filters: Filters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.year) params.set("year", filters.year);
  if (filters.season) params.set("season", filters.season);
  if (filters.topic) params.set("topic", filters.topic);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function ArchivePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(
    () => readFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [filters, setFilters] = useState<Filters>(initial);
  const [items, setItems] = useState<IssueSummaryDto[]>([]);
  const [facets, setFacets] = useState<CatalogFacetsDto | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");

  // Keeps the facet lists from disappearing while a filtered page loads.
  const facetsRef = useRef<CatalogFacetsDto | null>(null);

  const search = useCallback(async (active: Filters, signal: AbortSignal) => {
    const data = await apiFetch<ArchiveResponse>(
      `/api/miniapp/catalog/archive?${toQueryString(active)}`,
      { signal },
    );
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Debounce so typing does not fire one request per keystroke.
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const data = await search(filters, controller.signal);
        if (cancelled) return;

        setItems(data.items);
        setNextCursor(data.nextCursor);
        if (data.facets) {
          facetsRef.current = data.facets;
          setFacets(data.facets);
        } else {
          setFacets(facetsRef.current);
        }
        setStatus("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setMessage(error instanceof ApiError ? error.message : "بارگذاری آرشیو ممکن نشد.");
        setStatus("error");
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, search]);

  // Mirror the active filters into the URL without adding history entries.
  useEffect(() => {
    const query = toQueryString(filters);
    router.replace(query ? `/miniapp/archive?${query}` : "/miniapp/archive", { scroll: false });
  }, [filters, router]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await apiFetch<ArchiveResponse>(
        `/api/miniapp/catalog/archive?${toQueryString(filters, nextCursor)}`,
      );
      setItems((current) => [...current, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "بارگذاری ادامه ممکن نشد.");
    } finally {
      setLoadingMore(false);
    }
  }

  function update<K extends keyof Filters>(key: K, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const hasFilters = Boolean(filters.q || filters.year || filters.season || filters.topic);

  return (
    <div className="space-y-4 py-2">
      <Card>
        <label htmlFor="archive-search" className="mb-1.5 block text-sm font-medium">
          جست‌وجو
        </label>
        <TextInput
          id="archive-search"
          type="search"
          inputMode="search"
          placeholder="عنوان یا شماره مجله"
          value={filters.q}
          onChange={(event) => update("q", event.target.value)}
        />

        <div className="mt-3 space-y-3">
          <FilterChips
            label="سال"
            value={filters.year}
            options={(facets?.years ?? []).map((year) => ({
              value: String(year),
              label: String(year),
            }))}
            onChange={(value) => update("year", value)}
          />
          <FilterChips
            label="فصل"
            value={filters.season}
            options={(facets?.seasons ?? []).map((season) => ({
              value: season,
              label: seasonLabel(season),
            }))}
            onChange={(value) => update("season", value)}
          />
          <FilterChips
            label="موضوع"
            value={filters.topic}
            options={(facets?.topics ?? []).map((topic) => ({ value: topic, label: topic }))}
            onChange={(value) => update("topic", value)}
          />
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => setFilters({ q: "", year: "", season: "", topic: "" })}
            className="mt-3 text-xs font-medium text-link"
          >
            پاک کردن فیلترها
          </button>
        ) : null}
      </Card>

      {status === "error" ? <Alert>{message}</Alert> : null}

      {status === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted">
          <Spinner small />
          <span className="text-sm">در حال بارگذاری…</span>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <Muted>
            {hasFilters
              ? "با این جست‌وجو و فیلترها شماره‌ای پیدا نشد."
              : "هنوز شماره‌ای منتشر نشده است."}
          </Muted>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {items.map((issue) => (
              <IssueGridCard key={issue.slug} issue={issue} />
            ))}
          </div>

          {nextCursor ? (
            <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
              نمایش شماره‌های بیشتر
            </Button>
          ) : (
            <p className="pb-2 text-center text-xs text-muted">پایان فهرست</p>
          )}
        </>
      )}
    </div>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              // Tapping the active chip clears that facet.
              onClick={() => onChange(active ? "" : option.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-link bg-link/10 font-medium text-link"
                  : "border-border-subtle text-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
