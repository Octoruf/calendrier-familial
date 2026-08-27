-- ================================================================
-- NOTRE CALENDRIER FAMILIAL — Schéma Supabase
-- ----------------------------------------------------------------
-- À exécuter UNE SEULE FOIS dans le SQL Editor de ton projet
-- Supabase (Dashboard → SQL Editor → New query → Run).
--
-- Ce script crée la table « events » et active le RLS (Row Level
-- Security) avec des politiques qui autorisent la clé « anon »
-- (publique) à lire/écrire. C'est ce qui permet au calendrier de
-- fonctionner SANS compte utilisateur (choix du profil simple).
-- ================================================================

-- Supprime une éventuelle ancienne version (attention : efface les données)
DROP TABLE IF EXISTS public.events;

-- Crée la table des événements
CREATE TABLE public.events (
  id          TEXT PRIMARY KEY,          -- identifiant unique généré côté client
  title       TEXT NOT NULL,             -- titre de l'événement
  date        TEXT NOT NULL,             -- date "YYYY-MM-DD"
  start_time  TEXT,                      -- heure de début "HH:MM" (facultatif)
  end_time    TEXT,                      -- heure de fin "HH:MM"   (facultatif)
  description TEXT,                      -- description (facultatif)
  owner       TEXT NOT NULL,             -- membre : alex, alyssa, papa, maman
  created_at  TIMESTAMPTZ DEFAULT now()  -- horodatage de création
);

-- Active le Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- POLITIQUES RLS
-- ----------------------------------------------------------------
-- La clé « anon » est publique : ces politiques autorisent n'importe
-- qui (avec l'URL + la clé anon) à lire et modifier le calendrier.
-- C'est le comportement voulu pour une famille privée sans login.
-- ⚠️ Si tu veux restreindre l'accès plus tard (comptes + mots de
--    passe), remplace ces politiques par des politiques basées sur
--    auth.uid().

-- Lecture : tout le monde (anon) peut voir tous les événements.
CREATE POLICY "events_select_all" ON public.events
  FOR SELECT USING (true);

-- Insertion : autorisée pour anon.
CREATE POLICY "events_insert_all" ON public.events
  FOR INSERT WITH CHECK (true);

-- Modification : autorisée pour anon.
CREATE POLICY "events_update_all" ON public.events
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression : autorisée pour anon.
CREATE POLICY "events_delete_all" ON public.events
  FOR DELETE USING (true);

-- ----------------------------------------------------------------
-- BONUS — index sur la date pour des recherches plus rapides
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events (date);

-- ================================================================
-- ABONNEMENTS PUSH (préparation des notifications)
-- ================================================================
-- Un enregistrement par navigateur/appareil. L'endpoint est unique.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint     TEXT PRIMARY KEY,
  subscription JSONB NOT NULL,
  member       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_update_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_all" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select_all" ON public.push_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "push_subscriptions_insert_all" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "push_subscriptions_update_all" ON public.push_subscriptions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "push_subscriptions_delete_all" ON public.push_subscriptions
  FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS push_subscriptions_member_idx
  ON public.push_subscriptions (member);