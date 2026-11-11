import {
  pgTable, text, timestamp, integer, primaryKey,
  uuid, doublePrecision, index,
} from "drizzle-orm/pg-core";

// ---- Auth.js tables ----
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// ---- Kanban tables ----
export const boards = pgTable("board", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: text("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const boardMembers = pgTable("board_member", {
  boardId: uuid("boardId").notNull().references(() => boards.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.boardId, t.userId] })]);

export const columns = pgTable("column", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("boardId").notNull().references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull(),
}, (t) => [index("column_board_idx").on(t.boardId)]);

export const cards = pgTable("card", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("boardId").notNull().references(() => boards.id, { onDelete: "cascade" }),
  columnId: uuid("columnId").notNull().references(() => columns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: doublePrecision("position").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("card_board_idx").on(t.boardId)]);
