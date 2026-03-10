"use client";

import { useEffect } from "react";

export const ServiceWorkerRegistrar = () => {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").catch(() => {
				// SW registration failed — not critical, silently ignore
			});
		}
	}, []);

	return null;
};
