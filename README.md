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
- `/dashboard` : voir les courbes de la saison de référence
- `/seasons` : récap des saisons terminées, sélection de saison et graphiques complets sur 52 semaines
- Le CSV brut n'est jamais stocké
- Les doublons sont gérés avec `activity_id`
- Si TSS Garmin = 0, estimation via puissance puis FC
- `duration_hours` est prioritaire sur `moving_hours`

## 5. Authentification

- Cree un utilisateur dans Supabase Auth.
- La page `/login` utilise email + mot de passe.
- Les routes `/upload`, `/dashboard`, `/activities`, `/imports` et `/seasons` sont protegees.
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
PMC_CTL_DAYS=42
PMC_ATL_DAYS=7
```

4. Dans Supabase Auth > URL Configuration, ajoute l'URL Vercel en `Site URL`.
5. Deploy.

## Calendrier des saisons

Une saison commence le premier lundi de novembre à 00:00 et dure exactement
52 semaines de 7 jours. Sa fin inclusive correspond à son début plus
364 jours, moins une milliseconde. Elle porte le numéro de son année de fin.

Quand les premiers lundis de novembre sont espacés de 53 semaines, les sept
jours supplémentaires constituent une **transition hors saison** :

- Saison 2028 : du 1er novembre 2027 au 29 octobre 2028 inclus (semaines 1 à 52).
- Transition : du 30 octobre au 5 novembre 2028 inclus.
- Saison 2029 : à partir du 6 novembre 2028.

Les activités de transition restent dans l'historique, avec un filtre dédié,
et alimentent le calcul quotidien du PMC sans interruption. Elles sont exclues
des totaux, records, projections et comparaisons par saison. En base, leurs
champs `season`, `week_in_season` et `month_in_season` valent tous `NULL`.

Les calculs utilisent les dates UTC, comme les journées PMC.
Les jours de début novembre encore compris dans les 52 semaines sont classés
dans le dernier groupe mensuel de la saison précédente (Oct). Ceux de la
transition restent hors saison.
Les anciennes variables `GARMIN_SEASON_START_MONTH` et `GARMIN_SEASON_START_DAY`
ne sont plus utilisées.

Pour reclasser les activités et journées PMC déjà présentes, exécuter
`supabase/migrations/20261103_transition_week.sql` dans le SQL Editor de
Supabase. Le script conserve les charges TSS/CTL/ATL/TSB et les identifiants.
Exécuter cette migration avant les nouveaux imports : elle autorise les valeurs
`NULL` de transition et reclasse les données existantes, même si la migration
précédente a déjà été exécutée. Les lectures du dashboard et de l’historique
reclassent également les dates selon la règle corrigée.

Validation du calendrier : `npm test`.

## Suivi du plan annuel

La page `/plan` compare les heures et TSS prévus aux activités Garmin : semaine
à date, graphiques hebdomadaires et cumulés, détail des journées et historique
des dix derniers imports. Accessible dans la navigation et depuis `/upload`.

Avant utilisation, exécuter `supabase/migrations/20261104_training_plan.sql`
dans le SQL Editor de Supabase, y compris pour une nouvelle installation après
`schema.sql`. Cette migration ajoute les tables du plan et une fonction d'import
transactionnelle, réservée au serveur. Chaque utilisateur possède son plan ;
les activités comparées restent celles du jeu de données Garmin de l'application.

Modèle téléchargeable : `/plan-exemple.csv`. Colonnes, dans n'importe quel ordre :

```csv
date;phase;type semaine;durée (h);Tss cible
02/11/2026;Reprise;Charge 1;1;40
03/11/2026;Reprise;Charge 1;0,75;0
```

Dates `JJ/MM/AAAA` ou `AAAA-MM-JJ`, séparateurs point-virgule, virgule ou tabulation,
décimales avec point ou virgule (entre guillemets si le séparateur est la virgule).
Une seule ligne par jour. Une cellule numérique vide signifie « non renseigné » ;
zéro est un objectif explicite. Phase et type de semaine sont obligatoires.
Les fichiers sont limités à 2 Mo et 4 000 journées. Une erreur invalide tout l'import.

**Imports progressifs :** importer novembre–janvier, puis novembre–avril trois
mois plus tard. Les dates communes sont mises à jour, les nouvelles sont ajoutées,
les absentes sont conservées. Les valeurs vides écrasent les objectifs précédents
sur les dates présentes. Un fichier identique n'ajoute aucun doublon. Chaque import
archive ses entrées structurées et les comptes ajoutés/modifiés/inchangés ; le CSV
brut n'est pas stocké. Le suivi utilise les dernières valeurs enregistrées.

Les journées utilisent UTC, comme les saisons. Le suivi s'arrête à la date
sélectionnée (aujourd'hui par défaut), incluse. Le réalisé n'est pas extrapolé dans
le futur. La date du dernier import Garmin est affichée : une absence d'activité
importée n'atteste pas qu'aucune séance n'a été faite. Les TSS estimés ou manquants
sont signalés. Les objectifs hebdomadaires incomplets restent inconnus, et les
cumulés prévus s'arrêtent au premier objectif manquant. La durée réelle utilise
`duration_hours`, puis `moving_hours` si elle est absente ; le TSS utilise `tss_final`.

Validation des imports et comparaisons : `npm test` et `npx tsc --noEmit`.
