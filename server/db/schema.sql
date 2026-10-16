-- Mirrors the schema created by the .NET EF Core migrations (FolkApp.Infrastructure/Migrations).
-- The production database already has it; this file is for local development and tests.

CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS account;
CREATE SCHEMA IF NOT EXISTS favourite;
CREATE SCHEMA IF NOT EXISTS holiday;

CREATE TABLE IF NOT EXISTS media."Artist" (
    "Id" uuid PRIMARY KEY,
    "ArtistType" integer NOT NULL,
    "Name" character varying(70) NOT NULL
);

CREATE TABLE IF NOT EXISTS media."Song" (
    "Id" uuid PRIMARY KEY,
    "ArtistId" uuid NOT NULL REFERENCES media."Artist" ("Id") ON DELETE CASCADE,
    "SongType" integer NOT NULL,
    "Name" character varying(150) NOT NULL,
    "Path" character varying(150) NOT NULL,
    "DownloadCount" integer NOT NULL DEFAULT 0,
    "PlayCount" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "IX_Song_ArtistId" ON media."Song" ("ArtistId");

CREATE TABLE IF NOT EXISTS account."Account" (
    "Id" uuid PRIMARY KEY,
    "Deactivated" boolean NOT NULL,
    "Email" text NOT NULL,
    "IsActive" boolean NOT NULL,
    "Password" text NOT NULL,
    "Salt" text NOT NULL,
    "FirstName" text NOT NULL,
    "LastName" text NOT NULL
);

CREATE TABLE IF NOT EXISTS account."AccountDevice" (
    "Id" uuid PRIMARY KEY,
    "AccountId" uuid NOT NULL REFERENCES account."Account" ("Id") ON DELETE CASCADE,
    "DeviceId" text NOT NULL,
    "LoginTime" timestamp with time zone NOT NULL,
    "PlatformOs" integer NOT NULL,
    "Token" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_AccountDevice_AccountId" ON account."AccountDevice" ("AccountId");

CREATE TABLE IF NOT EXISTS account."AccountVerification" (
    "Id" uuid PRIMARY KEY,
    "AccountId" uuid NOT NULL REFERENCES account."Account" ("Id") ON DELETE CASCADE,
    "Code" text NOT NULL,
    "DateVerificationSent" timestamp with time zone NOT NULL,
    "Expired" boolean NOT NULL,
    "Verified" boolean NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_AccountVerification_AccountId" ON account."AccountVerification" ("AccountId");

CREATE TABLE IF NOT EXISTS favourite."AccountFavouriteSong" (
    "Id" uuid PRIMARY KEY,
    "AccountId" uuid NOT NULL REFERENCES account."Account" ("Id") ON DELETE CASCADE,
    "SongId" uuid NOT NULL REFERENCES media."Song" ("Id") ON DELETE CASCADE,
    "CreateDate" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_AccountFavouriteSong_AccountId" ON favourite."AccountFavouriteSong" ("AccountId");
CREATE INDEX IF NOT EXISTS "IX_AccountFavouriteSong_SongId" ON favourite."AccountFavouriteSong" ("SongId");

CREATE TABLE IF NOT EXISTS holiday."Holiday" (
    "Id" uuid PRIMARY KEY,
    "Date" timestamp with time zone NOT NULL,
    "Description" text NOT NULL,
    "ImagePath" text NOT NULL,
    "Title" text NOT NULL
);

CREATE TABLE IF NOT EXISTS holiday."HolidaySong" (
    "Id" uuid PRIMARY KEY,
    "HolidayId" uuid NOT NULL REFERENCES holiday."Holiday" ("Id") ON DELETE CASCADE,
    "SongId" uuid NOT NULL REFERENCES media."Song" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_HolidaySong_HolidayId" ON holiday."HolidaySong" ("HolidayId");
CREATE INDEX IF NOT EXISTS "IX_HolidaySong_SongId" ON holiday."HolidaySong" ("SongId");

CREATE TABLE IF NOT EXISTS media."PlayList" (
    "Id" uuid PRIMARY KEY,
    "AccountId" uuid NOT NULL REFERENCES account."Account" ("Id") ON DELETE CASCADE,
    "Name" character varying(100) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_PlayList_AccountId" ON media."PlayList" ("AccountId");

CREATE TABLE IF NOT EXISTS media."PlayListSong" (
    "Id" uuid PRIMARY KEY,
    "PlayListId" uuid NOT NULL REFERENCES media."PlayList" ("Id") ON DELETE CASCADE,
    "SongId" uuid NOT NULL REFERENCES media."Song" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_PlayListSong_PlayListId" ON media."PlayListSong" ("PlayListId");
CREATE INDEX IF NOT EXISTS "IX_PlayListSong_SongId" ON media."PlayListSong" ("SongId");
