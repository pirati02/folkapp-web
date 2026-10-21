-- Mirrors the schema created by the .NET EF Core migrations (FolkApp.Infrastructure/Migrations).
-- The production database already has it; this file is for local development and tests.

CREATE SCHEMA IF NOT EXISTS media;
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

