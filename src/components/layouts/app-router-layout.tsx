import { ViewTransitions } from "next-view-transitions";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { KitProvider } from "@/components/providers/kit-provider";
import { ThemeProvider } from "@/components/ui/shipkit/theme";
import { auth } from "@/server/auth";

/**
 * Root layout component that wraps the entire application
 */
export async function AppRouterLayout({
	children,
	themeProvider: ThemeProviderWrapper = ThemeProvider,
}: {
	children: ReactNode;
	themeProvider?: typeof ThemeProvider;
}) {
	const session = await auth();

	return (
		<ViewTransitions>
			<ThemeProviderWrapper>
				<KitProvider session={session}>
					<NuqsAdapter>{children}</NuqsAdapter>
				</KitProvider>
			</ThemeProviderWrapper>
		</ViewTransitions>
	);
}
