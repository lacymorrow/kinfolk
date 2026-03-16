import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
	return (
		<>
			{children}
			<SpeedInsights />
			<VercelAnalytics />
		</>
	);
};
