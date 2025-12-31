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

export interface Database {
	users: UsersTable;
}

export function createDb(d1: D1Database): Kysely<Database> {
	return new Kysely<Database>({
		dialect: new D1Dialect({ database: d1 }),
	});
}
