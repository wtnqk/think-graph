import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { NodeType } from "../domain/node.js";
import type { UserId, GoogleId, NodeId, EdgeId } from "../domain/ids.js";
import type { Email, UserName } from "../domain/user.js";

export interface UsersTable {
	id: UserId;
	google_id: GoogleId;
	email: Email;
	name: UserName;
	created_at: string;
	updated_at: string;
}

export interface NodesTable {
	id: NodeId;
	type: NodeType;
	parent_id: NodeId | null;
	owner_id: UserId;
	title: string;
	content: string | null;
	created_at: string;
	updated_at: string;
}

export interface EdgesTable {
	id: EdgeId;
	source_id: NodeId;
	target_id: NodeId;
	created_at: string;
}

export interface NodeLikesTable {
	node_id: NodeId;
	user_id: UserId;
	created_at: string;
}

export interface Database {
	users: UsersTable;
	nodes: NodesTable;
	edges: EdgesTable;
	node_likes: NodeLikesTable;
}

export type DB = Kysely<Database>;

export function createDb(d1: D1Database): DB {
	return new Kysely<Database>({
		dialect: new D1Dialect({ database: d1 }),
	});
}
