"use client";

import { useEffect } from "react";
import Link from "next/link";

const DB_ERROR_SIGNALS = [
	"ECONNREFUSED",
	"ENOTFOUND",
	"ETIMEDOUT",
	"CONNECT_TIMEOUT",
	"Connection terminated",
	"Connection ended",
	"sasl",
	"password authentication",
	"SSL",
	"tenant",
	"paused",
	"could not connect",
];

function looksLikeDbError(message: string) {
	return DB_ERROR_SIGNALS.some((signal) => message.toLowerCase().includes(signal.toLowerCase()));
}

export default function KinfolkError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Kinfolk route error:", error);
	}, [error]);

	const isDbIssue = looksLikeDbError(error.message ?? "");

	return (
		<div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
			<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
				{isDbIssue ? "Kinfolk is temporarily unavailable" : "Something went wrong"}
			</h1>
			<p className="mt-3 text-muted-foreground">
				{isDbIssue
					? "We can't reach the family database right now. This is usually brief — please try again in a moment."
					: "An unexpected error occurred while loading this page."}
			</p>

			{process.env.NODE_ENV === "development" && (
				<pre className="mt-4 max-w-full overflow-auto rounded-md border bg-muted/40 p-3 text-left text-xs">
					{error.message}
					{error.digest ? `\n\ndigest: ${error.digest}` : ""}
				</pre>
			)}

			<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
				<button
					type="button"
					onClick={() => reset()}
					className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					Try again
				</button>
				<Link
					href="/"
					className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					Back home
				</Link>
			</div>
		</div>
	);
}
