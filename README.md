# 📅 Notre calendrier familial

Une application web familiale (HTML/CSS/JS vanilla, un seul fichier) permettant à 4 membres — Alex, Alyssa, Papa, Maman — de consulter et de modifier un calendrier commun, **synchronisé sur tous les appareils grâce à Supabase**.

## Fonctionnalités

- Écran d'accueil : choix du profil parmi 4 membres (chacun sa couleur).
- Calendrier mensuel : navigation mois précédent/suivant, bouton *Aujourd'hui*, indicateur du jour courant.
- Ajout / modification / suppression d'événements (avec confirmation de suppression).
- Chaque événement porte la couleur de son créateur + légende.
- Filtre par membre, vue « Aujourd'hui », notifications visuelles.
- Conçu avec le SDK Supabase (vanilla, sans framework).

## ⚙️ Configuration Supabase (à faire une seule fois)

> ⚠️ Le site ne fonctionne complètement qu'une fois la configuration ci-dessous faite. Sans elle, le calendrier affichera un message d'erreur « impossible de se connecter à Supabase ».

### 1. Créer le projet

1. Rends-toi sur [supabase.com](https://supabase.com) et connecte-toi (ou crée un compte gratuit).
2. **New project** → choisis un nom (ex. `calendrier-familial`), un mot de passe de base de données, une région proche.
3. Une fois le projet créé, note :

   - **Project URL** (ex. `https://xxxx.supabase.co`)
   - **anon public key** (clé qui commence par `eyJ...`)

   → Tout se trouve dans **Project Settings → API**.

### 2. Créer la base de données

1. Dans le tableau de bord, va dans **SQL Editor** → **New query**.
2. Copie-colle **tout** le contenu du fichier `supabase-schema.sql` (livré avec ce projet).
3. Clique sur **Run** (ou ▶️).

   Cela crée la table `events` et les règles d'accès (RLS) qui permettent au calendrier de lire/écrire **sans tableau de connexion**.

### 3. Vérifier la configuration dans `index.html`

Ouvre `index.html` et contrôle que les deux constantes du bloc **CONFIGURATION SUPABASE** contiennent bien tes valeurs (elles sont déjà renseignées pour le projet de la famille) :

```js
const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

### 4. Ouvrir le site

Double-clique sur `index.html` (ou sers-le avec un petit serveur statique) et choisis un profil : le calendrier se charge depuis Supabase.

## 🔒 Sécurité (à lire)

- Ce calendrier utilise la **clé `anon` publique**. Elle est mise dans le fichier HTML **sans compte utilisateur**, et les règles RLS autorisent cette clé à lire/écrire dans la table `events`.
- Conséquence : toute personne qui possède l'URL + la clé anon peut **modifier ou supprimer** les événements. C'est acceptable pour un usage familial privé, mais **ne mets jamais la clé `service_role` dans le front** (accès total à la base).
- Pour restreindre réellement l'accès, il faudrait passer à des **comptes utilisateurs Supabase** (email/mot de passe) et remplacer les politiques RLS par des politiques basées sur `auth.uid()`.

## 🔔 Notifications push

La PWA contient maintenant la préparation complète côté navigateur :

- bouton volontaire « Activer les notifications » ;
- abonnement Push API enregistré dans `push_subscriptions` ;
- service worker capable d'afficher un payload push ;
- Edge Function `supabase/functions/send-push/index.ts` préparée pour l'envoi.

Pour activer réellement les push :

1. Génère une paire de clés VAPID avec Node.js et le paquet `web-push` :

   ```bash
   npx web-push generate-vapid-keys
   ```

   Tu obtiendras une clé publique et une clé privée.
2. Remplace uniquement `PUSH_VAPID_PUBLIC_KEY` dans `index.html` par la clé publique.
   **Ne mets jamais la clé privée dans HTML ou GitHub.**
3. Configure les secrets VAPID dans Supabase :

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY="..."
   supabase secrets set VAPID_PRIVATE_KEY="..."
   supabase secrets set VAPID_SUBJECT="mailto:ton-email@example.com"
   ```

4. Déploie l'Edge Function :

   ```bash
   supabase functions deploy send-push --no-verify-jwt
   ```

5. Exécute la partie `push_subscriptions` de `supabase-schema.sql` si ce n'est pas déjà fait.
6. Installe la PWA depuis une adresse HTTPS, puis appuie sur « Activer les notifications ».
7. Vérifie que l'Edge Function utilise bien `jsr:@negrel/webpush` et qu'elle est déployée. L'appel client déclenche l'envoi après un ajout ou une modification.

L'envoi automatique est déclenché après un ajout ou une modification d'événement. Les notifications push exigent HTTPS (GitHub Pages convient) et ne fonctionnent pas en ouvrant le fichier avec `file://`. Sur iPhone/iPad, la PWA doit être ajoutée à l'écran d'accueil et les notifications Web Push nécessitent une version récente d'iOS/iPadOS.

## 🚀 Évolutions possibles

- Mise à jour **temps réel** : utiliser `supabase.channel()` (Realtime) pour voir les changements des autres membres sans recharger la page.
- Partage via téléphone : héberger le fichier sur un service statique (Netlify, Vercel, GitHub Pages…) et partager l'URL.
- Comptes individuels sécurisés par mot de passe.