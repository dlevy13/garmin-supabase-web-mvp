# Garmin Supabase Web MVP

MVP Next.js + Supabase pour importer un export Garmin CSV, ne pas stocker le fichier brut, stocker les activités propres dans Supabase, calculer TSS puis CTL / ATL / TSB.

## 1. Supabase

Dans Supabase > SQL Editor, exécute :

```sql
supabase/schema.sql
```

## 2. Variables

Cree `.env.local` a partir de `.env.example`.

```bash
cp .env.example .env.local
```

Remplis :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GARMIN_FTP=250
GARMIN_THRESHOLD_HR=170
GARMIN_SEASON_START_MONTH=11
GARMIN_SEASON_START_DAY=1
PMC_CTL_DAYS=42
PMC_ATL_DAYS=7
```

## 3. Installation

```bash
npm install
npm run dev
```

Puis ouvre :

```text
http://localhost:3000
```

## 4. Workflow

- `/upload` : importer le CSV Garmin
- `/dashboard` : voir les courbes
- Le CSV brut n'est jamais stocké
- Les doublons sont gérés avec `activity_id`
- Si TSS Garmin = 0, estimation via puissance puis FC
- `duration_hours` est prioritaire sur `moving_hours`

## 5. Authentification

- Cree un utilisateur dans Supabase Auth.
- La page `/login` utilise email + mot de passe.
- Les routes `/upload`, `/dashboard`, `/activities` et `/imports` sont protegees.
- La route `POST /api/import-garmin` est aussi protegee.
- `SUPABASE_SERVICE_ROLE_KEY` n'est utilise que cote serveur.

## 6. Deploiement Vercel

1. Pousse le repo sur GitHub.
2. Importe le projet dans Vercel.
   Root Directory: `Projets_GIT/garmin_supabase_web_mvp`
3. Dans Vercel > Settings > Environment Variables, ajoute :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GARMIN_FTP=250
GARMIN_THRESHOLD_HR=170
GARMIN_SEASON_START_MONTH=11
GARMIN_SEASON_START_DAY=1
PMC_CTL_DAYS=42
PMC_ATL_DAYS=7
```

4. Dans Supabase Auth > URL Configuration, ajoute l'URL Vercel en `Site URL`.
5. Deploy.
