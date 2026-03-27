import Script from "next/script";

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "3eac81ff-b6c4-4034-9e16-387819550c14";

export const UmamiAnalytics = () => {
	return (
		<Script
			src="https://analytics.lacy.sh/script.js"
			data-website-id={WEBSITE_ID}
			defer
		/>
	);
};
