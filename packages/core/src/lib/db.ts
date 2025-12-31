import { D1Dialect } from "kysely-d1";
import { Kysely } from "kysely";

export interface UsersTable {
  id: string;
  google_id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface NodesTable {
  id: string;
  type: string;
  parent_id: string | null;
  owner_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface EdgesTable {
  id: string;
  source_id: string;
  target_id: string;
  created_at: string;
}

export interface NodeLikesTable {
  node_id: string;
  user_id: string;
  created_at: string;
}

export interface Database {
  users: UsersTable;
  nodes: NodesTable;
  edges: EdgesTable;
  node_likes: NodeLikesTable;
}

export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
