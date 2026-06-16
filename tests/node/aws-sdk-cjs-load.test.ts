import { describe, expect, it } from "vitest";

/**
 * Regression test for LAC-2395.
 *
 * @aws-sdk/xml-builder@3.972.20–3.972.29 pulled in @nodable/entities@2.1.0
 * as a direct dependency. @nodable/entities ships ESM-only, but the
 * xml-builder CJS bundle did `require("@nodable/entities")` — which throws
 * ERR_REQUIRE_ESM under Node's CJS loader in the Vercel runtime, taking
 * every page that touches Payload's S3 storage adapter to a 500.
 *
 * The override pins xml-builder to 3.972.30+, which inlines the entities
 * data and no longer reaches across the CJS/ESM boundary. If this test
 * starts failing, a future bump has dropped that override.
 */
describe("@aws-sdk/xml-builder CJS loadability", () => {
	it("loads under CommonJS without ERR_REQUIRE_ESM", async () => {
		const mod = await import("@aws-sdk/xml-builder");
		expect(mod).toBeDefined();
		expect(typeof mod.XmlNode ?? mod.XmlText ?? mod).not.toBe("undefined");
	});

	it("pins @aws-sdk/xml-builder to a version that inlines @nodable/entities", async () => {
		const pkg = await import("@aws-sdk/xml-builder/package.json", {
			with: { type: "json" },
		});
		const version: string = (pkg as any).default?.version ?? (pkg as any).version;
		const [major, minor, patch] = version.split(".").map((n) => Number.parseInt(n, 10));
		// Anything >= 3.972.30 dropped the @nodable/entities dep.
		expect(major).toBe(3);
		expect(minor >= 972).toBe(true);
		if (minor === 972) {
			expect(patch >= 30).toBe(true);
		}
	});
});
