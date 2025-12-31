import { type } from "arktype";

// ArkType schemas for runtime validation
export const ApiNodeSchema = type({
	id: "string",
	type: "'issue' | 'idea' | 'output' | 'comment'",
	title: "string",
	"content?": "string | null",
	owner_id: "string",
	"parent_id?": "string | null",
	created_at: "string",
	updated_at: "string",
});

export const ApiEdgeSchema = type({
	id: "string",
	source_id: "string",
	target_id: "string",
	created_at: "string",
});

export const ApiUserSchema = type({
	id: "string",
	email: "string",
	name: "string",
});

// Type inference from schemas
export type ApiNode = typeof ApiNodeSchema.infer;
export type ApiEdge = typeof ApiEdgeSchema.infer;
export type ApiUser = typeof ApiUserSchema.infer;

// SvelteFlow node data type (extends Record for SvelteFlow compatibility)
export interface NodeData extends Record<string, unknown> {
	label: string;
	type: "issue" | "idea" | "output" | "comment";
	content?: string;
	owner_id: string;
	parent_id?: string;
}
