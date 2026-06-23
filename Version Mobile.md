# Script de présentation - Version mobile du dashboard

La version mobile du dashboard doit reprendre les mêmes informations que la version desktop, mais avec une navigation plus simple, plus verticale et plus rapide à consulter.

L’objectif n’est pas d’afficher tous les graphiques en même temps, mais de permettre à l’utilisateur de comprendre rapidement l’état de sa saison depuis son téléphone.

---

## Écran d’accueil mobile

En haut de l’écran, on affiche une barre simple avec :

* le nom de l’application : **Season Analyzer**
* la saison active : **2025 / 2026**
* un bouton d’import rapide

Exemple :

```text
Season Analyzer
Saison 2025 / 2026 · semaine 33
```

Le bouton d’import peut être placé en haut à droite avec une icône simple.

---

## Cartes KPI

Juste sous l’en-tête, on affiche les KPI principaux sous forme de cartes scrollables horizontalement.

Cartes affichées :

* TSS saison
* Heures
* Distance
* D+
* CTL
* ATL
* TSB

Chaque carte doit être compacte :

```text
TSS saison
13 382
+12,4% vs 2024
```

Sur mobile, les cartes peuvent être présentées en carrousel horizontal pour éviter de surcharger l’écran.

---

## Navigation mobile

Au lieu du menu latéral desktop, on utilise une navigation en bas de l’écran.

Menu bas :

```text
Dashboard | Graphes | Activités | Imports | Plus
```

Ou version plus orientée analyse :

```text
Synthèse | Hebdo | Cumulé | PMC | Données
```

Recommandation :

```text
Synthèse
Hebdo
Cumulé
PMC
Données
```

---

## Onglet Synthèse

L’onglet **Synthèse** doit donner une lecture immédiate de la saison.

Contenu :

1. cartes KPI
2. mini graphique TSS
3. mini graphique CTL / ATL / TSB
4. bloc résumé

Exemple de résumé :

```text
Saison 2025 / 2026

Tu es à la semaine 33.
Le TSS est en hausse de 12% vs la saison précédente.
Le volume horaire est stable.
La fatigue récente est élevée avec un TSB de -12,6.
```

---

## Onglet Hebdo

L’onglet **Hebdo** affiche les graphiques semaine par semaine.

Sur mobile, on ne met pas 4 graphiques visibles d’un coup.

On affiche un sélecteur :

```text
TSS | Heures | Distance | D+
```

L’utilisateur choisit la métrique.

Le graphique prend toute la largeur de l’écran.

Axe X :

```text
Nov · Jan · Mar · Mai · Juil · Sep
```

Chaque courbe correspond à une saison.

---

## Onglet Cumulé

L’onglet **Cumulé** fonctionne comme l’onglet Hebdo, mais avec des courbes cumulatives.

Sélecteur :

```text
TSS | Heures | Distance | D+
```

Objectif :

voir si la saison actuelle est en avance ou en retard.

Exemple :

```text
TSS cumulé
Saison 2026 vs 2025 vs 2024
```

---

## Onglet PMC

L’onglet **PMC** affiche la charge d’entraînement.

Sélecteur :

```text
CTL | ATL | TSB
```

Chaque vue montre une courbe par saison.

Explication courte sous le graphique :

```text
CTL = fitness long terme
ATL = fatigue récente
TSB = fraîcheur
```

Le TSB peut être mis en avant car c’est l’indicateur le plus lisible pour savoir si l’utilisateur est fatigué ou frais.

---

## Onglet Données

L’onglet **Données** regroupe :

* activités récentes
* imports récents
* sources TSS

Exemple :

```text
Dernières activités

17 juin · Home trainer · 42 TSS
15 juin · Route · 67 TSS
12 juin · Route · 179 TSS
```

Chaque activité peut être affichée en carte compacte.

---

## Interaction mobile

Le dashboard mobile doit être pensé pour une consultation rapide :

* un graphique à la fois
* peu de texte
* cartes compactes
* scroll vertical naturel
* filtres simples
* pas de tableaux larges

Les tableaux doivent être remplacés par des cartes.

---

## Design recommandé

Style :

* fond clair
* cartes blanches
* bordures légères
* accents violet / bleu
* typographie large et lisible
* arrondis généreux
* graphiques simples

La saison actuelle peut être mise en couleur plus vive.

Les saisons passées peuvent être en gris ou bleu clair.

---

## Structure mobile proposée

```text
Header fixe

KPI cards scroll horizontal

Tabs / bottom navigation

Contenu dynamique :
- Synthèse
- Hebdo
- Cumulé
- PMC
- Données
```

---

## Priorité de développement

### Étape 1

Rendre le dashboard actuel responsive.

* cartes KPI en grille mobile
* graphiques pleine largeur
* menu desktop masqué sur mobile

### Étape 2

Créer une vraie navigation mobile.

* bottom navigation
* onglets simples

### Étape 3

Créer des vues dédiées mobile.

* un graphique par écran
* sélecteur de métrique
* cartes activité

### Étape 4

Ajouter résumé intelligent.

Exemple :

```text
Ta saison actuelle est plus chargée que 2024 au même point, mais ta fatigue est aussi plus élevée.
```

---

## Objectif final

La version mobile doit permettre de répondre en moins de 10 secondes à trois questions :

1. Est-ce que ma saison est meilleure que la précédente ?
2. Est-ce que je suis en forme ou fatigué ?
3. Qu’est-ce qui a changé récemment ?

Le mobile n’a pas besoin d’être aussi complet que le desktop. Il doit être rapide, clair et orienté décision.
