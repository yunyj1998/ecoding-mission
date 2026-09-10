import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const workshops=sqliteTable('workshops',{id:text('id').primaryKey(),owner:text('owner').notNull(),revision:integer('revision').notNull().default(0),data:text('data').notNull()});
