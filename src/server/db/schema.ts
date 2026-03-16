/**
 * @fileoverview Database schema definitions for Kinfolk using Drizzle ORM
 * @module server/db/schema
 *
 * Key entities:
 * - Authentication: users, accounts, sessions, verificationTokens
 * - Kinfolk: families, people, contacts, addresses, relationships,
 *   kinfolkEvents, eventPeople, photos, photoTags, kinfolkPosts
 */

import { relations, sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	pgTableCreator,
	primaryKey,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { env } from "@/env";

/**
 * Table creator with optional prefix support.
 */
const createTable = pgTableCreator((name) => `${env?.DB_PREFIX ?? ""}_${name}`);

// =============================================================================
// AUTH — NextAuth.js tables
// =============================================================================

export const users = createTable("user", {
	id: varchar("id", { length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: varchar("name", { length: 255 }),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: timestamp("email_verified", {
		mode: "date",
		withTimezone: true,
	}).default(sql`CURRENT_TIMESTAMP`),
	image: varchar("image", { length: 255 }),
	password: varchar("password", { length: 255 }),
	role: varchar("role", { length: 50 }).default("user").notNull(),
	bio: text("bio"),
	theme: varchar("theme", { length: 20 }).default("system"),
	metadata: text("metadata"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
}));

export const accounts = createTable(
	"account",
	{
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccountType>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId],
		}),
		userIdIdx: index("account_user_id_idx").on(account.userId),
	})
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable("session", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verificationToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: timestamp("expires", { mode: "date" }).notNull(),
	},
	(verificationToken) => ({
		compositePk: primaryKey({
			columns: [verificationToken.identifier, verificationToken.token],
		}),
	})
);

export const authenticators = createTable(
	"authenticator",
	{
		credentialID: text("credentialID").notNull().unique(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		providerAccountId: text("providerAccountId").notNull(),
		credentialPublicKey: text("credentialPublicKey").notNull(),
		counter: integer("counter").notNull(),
		credentialDeviceType: text("credentialDeviceType").notNull(),
		credentialBackedUp: boolean("credentialBackedUp").notNull(),
		transports: text("transports"),
	},
	(authenticator) => ({
		compositePK: primaryKey({
			columns: [authenticator.userId, authenticator.credentialID],
		}),
	})
);

// =============================================================================
// KINFOLK — Family Directory Tables
// =============================================================================

export const families = createTable("family", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	createdBy: varchar("created_by", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const people = createTable("person", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	familyId: varchar("family_id", { length: 255 }).references(() => families.id, { onDelete: "cascade" }),
	userId: varchar("user_id", { length: 255 }).references(() => users.id),
	firstName: text("first_name").notNull(),
	middleName: text("middle_name"),
	lastName: text("last_name").notNull(),
	maidenName: text("maiden_name"),
	nickname: text("nickname"),
	birthdate: date("birthdate", { mode: "string" }),
	deathdate: date("deathdate", { mode: "string" }),
	gender: text("gender"),
	bio: text("bio"),
	avatarUrl: text("avatar_url"),
	isAlive: boolean("is_alive").default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const contacts = createTable("contact", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	personId: varchar("person_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }).notNull(),
	type: text("type").notNull(),
	subtype: text("subtype"),
	value: text("value").notNull(),
	isPrimary: boolean("is_primary").default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const addresses = createTable("address", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	personId: varchar("person_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }).notNull(),
	label: text("label"),
	street1: text("street1").notNull(),
	street2: text("street2"),
	city: text("city").notNull(),
	state: text("state").notNull(),
	zip: text("zip").notNull(),
	country: text("country").default("US"),
	isPrimary: boolean("is_primary").default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const relationships = createTable("relationship", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	personId: varchar("person_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }).notNull(),
	relatedId: varchar("related_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }).notNull(),
	type: text("type").notNull(),
	startedAt: text("started_at"),
	endedAt: text("ended_at"),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Kinfolk relations
export const familiesRelations = relations(families, ({ many }) => ({
	people: many(people),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
	family: one(families, { fields: [people.familyId], references: [families.id] }),
	user: one(users, { fields: [people.userId], references: [users.id] }),
	contacts: many(contacts),
	addresses: many(addresses),
	relationshipsFrom: many(relationships, { relationName: "personRelationships" }),
	relationshipsTo: many(relationships, { relationName: "relatedRelationships" }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
	person: one(people, { fields: [contacts.personId], references: [people.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
	person: one(people, { fields: [addresses.personId], references: [people.id] }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
	person: one(people, { fields: [relationships.personId], references: [people.id], relationName: "personRelationships" }),
	related: one(people, { fields: [relationships.relatedId], references: [people.id], relationName: "relatedRelationships" }),
}));

// =============================================================================
// KINFOLK Phase 2 — Events, Photos, Posts
// =============================================================================

export const kinfolkEvents = createTable("kinfolk_event", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	familyId: varchar("family_id", { length: 255 }).references(() => families.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	date: date("date", { mode: "string" }),
	location: text("location"),
	createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const eventPeople = createTable("event_person", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	eventId: varchar("event_id", { length: 255 }).references(() => kinfolkEvents.id, { onDelete: "cascade" }).notNull(),
	personId: varchar("person_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }).notNull(),
	role: text("role").notNull(),
});

export const photos = createTable("kinfolk_photo", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	familyId: varchar("family_id", { length: 255 }).references(() => families.id, { onDelete: "cascade" }),
	uploadedBy: varchar("uploaded_by", { length: 255 }).references(() => users.id),
	url: text("url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	caption: text("caption"),
	takenAt: date("taken_at", { mode: "string" }),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const photoTags = createTable("kinfolk_photo_tag", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	photoId: varchar("photo_id", { length: 255 }).references(() => photos.id, { onDelete: "cascade" }).notNull(),
	personId: varchar("person_id", { length: 255 }).references(() => people.id, { onDelete: "cascade" }),
	eventId: varchar("event_id", { length: 255 }).references(() => kinfolkEvents.id, { onDelete: "cascade" }),
});

export const kinfolkPosts = createTable("kinfolk_post", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	familyId: varchar("family_id", { length: 255 }).references(() => families.id, { onDelete: "cascade" }),
	authorId: varchar("author_id", { length: 255 }).references(() => users.id),
	title: text("title"),
	body: text("body").notNull(),
	pinned: boolean("pinned").default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Phase 2 relations
export const kinfolkEventsRelations = relations(kinfolkEvents, ({ one, many }) => ({
	family: one(families, { fields: [kinfolkEvents.familyId], references: [families.id] }),
	createdByUser: one(users, { fields: [kinfolkEvents.createdBy], references: [users.id] }),
	eventPeople: many(eventPeople),
	photoTags: many(photoTags),
}));

export const eventPeopleRelations = relations(eventPeople, ({ one }) => ({
	event: one(kinfolkEvents, { fields: [eventPeople.eventId], references: [kinfolkEvents.id] }),
	person: one(people, { fields: [eventPeople.personId], references: [people.id] }),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
	family: one(families, { fields: [photos.familyId], references: [families.id] }),
	uploadedByUser: one(users, { fields: [photos.uploadedBy], references: [users.id] }),
	tags: many(photoTags),
}));

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
	photo: one(photos, { fields: [photoTags.photoId], references: [photos.id] }),
	person: one(people, { fields: [photoTags.personId], references: [people.id] }),
	event: one(kinfolkEvents, { fields: [photoTags.eventId], references: [kinfolkEvents.id] }),
}));

export const kinfolkPostsRelations = relations(kinfolkPosts, ({ one }) => ({
	family: one(families, { fields: [kinfolkPosts.familyId], references: [families.id] }),
	author: one(users, { fields: [kinfolkPosts.authorId], references: [users.id] }),
}));

// Type exports
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;
export type KinfolkEvent = typeof kinfolkEvents.$inferSelect;
export type NewKinfolkEvent = typeof kinfolkEvents.$inferInsert;
export type EventPerson = typeof eventPeople.$inferSelect;
export type NewEventPerson = typeof eventPeople.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type PhotoTag = typeof photoTags.$inferSelect;
export type NewPhotoTag = typeof photoTags.$inferInsert;
export type KinfolkPost = typeof kinfolkPosts.$inferSelect;
export type NewKinfolkPost = typeof kinfolkPosts.$inferInsert;
