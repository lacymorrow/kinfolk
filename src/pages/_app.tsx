import type { AppProps } from "next/app";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import { KitProvider } from "@/components/providers/kit-provider";

export default function PagesApp({ Component, pageProps }: AppProps) {
	return (
		<KitProvider session={pageProps.session}>
			<NuqsAdapter>
				<Component {...pageProps} />
			</NuqsAdapter>
		</KitProvider>
	);
}
