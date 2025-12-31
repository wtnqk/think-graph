import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";

export default [
	js.configs.recommended,
	{
		files: ["**/*.{js,ts}"],
		languageOptions: {
			parser: tsparser,
			globals: {
				fetch: "readonly",
				window: "readonly",
				document: "readonly",
				console: "readonly",
				localStorage: "readonly",
				confirm: "readonly",
				atob: "readonly",
				RequestInit: "readonly",
				MouseEvent: "readonly",
				TouchEvent: "readonly",
				Env: "readonly",
				ExecutionContext: "readonly",
				CacheStorage: "readonly",
				IncomingRequestCfProperties: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"no-unused-vars": "off",
		},
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsparser,
			},
			globals: {
				fetch: "readonly",
				window: "readonly",
				document: "readonly",
				console: "readonly",
				localStorage: "readonly",
				confirm: "readonly",
				atob: "readonly",
				RequestInit: "readonly",
				MouseEvent: "readonly",
				TouchEvent: "readonly",
			},
		},
		plugins: {
			svelte,
		},
		rules: {
			...svelte.configs.recommended.rules,
			"svelte/no-unused-svelte-ignore": "warn",
			"svelte/no-target-blank": "error",
			"@typescript-eslint/no-unused-vars": "off",
			"no-unused-vars": "off",
		},
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/", "node_modules/", "*.d.ts"],
	},
];
