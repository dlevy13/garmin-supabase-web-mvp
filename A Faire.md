Priorité 8 : Historique des imports
Nouvelle page :
/imports
Contenu :
•	date import
•	fichier
•	nb activités importées
•	nb doublons ignorés
•	statut recalcul PMC
 
Priorité 9 : Consultation des activités
Nouvelle page :
/activities
Table filtrable.
Colonnes :
•	date
•	titre
•	type
•	durée
•	distance
•	FC moyenne
•	TSS Garmin
•	TSS final
•	source TSS
Objectif :
Audit des calculs.
 
Priorité 10 : Records
Ajouter :
Sorties
•	plus longue sortie
•	plus gros D+
•	plus gros TSS
Semaines
•	meilleure semaine TSS
•	meilleure semaine distance
•	meilleure semaine volume
Mois
•	meilleur mois TSS
•	meilleur mois distance
PMC
•	meilleur CTL atteint
 
Priorité 11 : Projections
Calcul dynamique.
Exemple :
Si le rythme actuel continue :

TSS : 20800
Heures : 390 h
Distance : 9800 km
D+ : 42000 m
 
Priorité 12 : Ergonomie
Améliorer :
•	couleurs des saisons
•	légendes
•	tooltips
•	unités
•	responsive mobile
•	lisibilité générale
Mettre en évidence :
Saison actuelle
avec un style spécifique.
 
Priorité 13 : Déploiement
Quand le dashboard est stable :
GitHub
Push du projet.
Vercel
Déploiement.
Variables
•	NEXT_PUBLIC_SUPABASE_URL
•	SUPABASE_SERVICE_ROLE_KEY
 
Priorité 14 : Authentification
Avant mise en production :
Login Supabase
Protection :
/upload
/dashboard
/activities
/imports
Ne jamais exposer :
SUPABASE_SERVICE_ROLE_KEY
côté client.
 
Vision finale
Créer un équivalent personnalisé de TrainingPeaks / Intervals.icu orienté :
•	comparaison multi-saisons
•	analyse historique
•	PMC
•	projections
•	records personnels
avec un import Garmin extrêmement simple :
Exporter Garmin
Importer CSV
Dashboard mis à jour

