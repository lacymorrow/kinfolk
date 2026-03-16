import { ErrorToast } from "@/components/primitives/error-toast";
import { JsonLd } from "@/components/primitives/json-ld";
import { KeyboardShortcutProvider } from "@/components/providers/keyboard-shortcut-provider";
import { ThemeProvider as ShipkitThemeProvider } from "@/components/ui/shipkit/theme";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as LegacyToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import HolyLoader from "holy-loader";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { FontProvider } from "@/components/providers/font-provider";
import { isAuthenticationAvailable } from "@/lib/auth/auth-strategy";

import "@/styles/globals.css";

interface KitProviderProps {
	children: ReactNode;
	session?: any;
}

/**
 * Main provider component that wraps all providers used in the application
 */
export function KitProvider({ children, session }: KitProviderProps) {
	const authEnabled = isAuthenticationAvailable();
	const sessionProviderProps = authEnabled
		? { session }
		: {
				session: null,
				refetchOnWindowFocus: false,
				refetchInterval: 0,
				refetchWhenOffline: false,
				refetchOnMount: false,
			};

	return (
		<>
			<JsonLd organization website />
			<HolyLoader
				showSpinner
				height={"4px"}
				color={"linear-gradient(90deg, #FF61D8, #8C52FF, #5CE1E6, #FF61D8)"}
			/>
			<ShipkitThemeProvider>
				<SessionProvider {...(sessionProviderProps as any)}>
					<TooltipProvider delayDuration={100}>
						<KeyboardShortcutProvider>
							<FontProvider>
								{children}

								<Toaster />
								<LegacyToaster />

								<Suspense>
									<ErrorToast />
								</Suspense>
							</FontProvider>
						</KeyboardShortcutProvider>
					</TooltipProvider>
				</SessionProvider>
			</ShipkitThemeProvider>
		</>
	);
}
