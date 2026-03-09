"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getRealtimeClient() {
	if (supabaseInstance) return supabaseInstance;

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) return null;

	supabaseInstance = createClient(url, key, {
		auth: { persistSession: false },
		realtime: { params: { eventsPerSecond: 2 } },
	});
	return supabaseInstance;
}

/**
 * The DB table prefix used by Drizzle's pgTableCreator.
 * Must match the DB_PREFIX env var (defaults to "db").
 * Exposed here so client components can build correct Postgres table names
 * for Supabase Realtime subscriptions.
 */
const DB_TABLE_PREFIX = process.env.NEXT_PUBLIC_DB_PREFIX ?? "db";

/** Map logical kinfolk entity names to actual Postgres table names */
export const KINFOLK_TABLES = {
	person: `${DB_TABLE_PREFIX}_person`,
	kinfolkEvent: `${DB_TABLE_PREFIX}_kinfolk_event`,
	kinfolkPost: `${DB_TABLE_PREFIX}_kinfolk_post`,
} as const;

/**
 * Subscribe to Postgres changes on specified tables via Supabase Realtime.
 * Triggers router.refresh() when INSERT, UPDATE, or DELETE events are detected,
 * so Server Components re-fetch fresh data.
 *
 * @param tables - Array of actual Postgres table names to subscribe to.
 *   Use KINFOLK_TABLES constants (e.g., KINFOLK_TABLES.person).
 */
export function useRealtimeSubscription(tables: string[]) {
	const router = useRouter();
	const tablesKey = tables.join(",");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const client = getRealtimeClient();
		if (!client) return;

		const channel = client.channel(`kinfolk-${tablesKey}`);

		for (const table of tables) {
			channel.on(
				"postgres_changes" as any,
				{ event: "*", schema: "public", table },
				() => {
					// Debounce rapid successive changes
					if (debounceRef.current) clearTimeout(debounceRef.current);
					debounceRef.current = setTimeout(() => {
						router.refresh();
					}, 500);
				},
			);
		}

		channel.subscribe();

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			client.removeChannel(channel);
		};
	}, [tablesKey, router]);
}
