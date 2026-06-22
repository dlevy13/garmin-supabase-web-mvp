# Script de présentation du dashboard

Ce dashboard est pensé comme un outil personnel d’analyse de saison cycliste. L’objectif est de comparer plusieurs saisons Garmin entre elles, au même point d’avancement, avec une lecture rapide des principaux indicateurs d’entraînement.

À gauche, on retrouve un menu latéral sombre avec plusieurs sections.

La première entrée, **Tableau de bord**, donne accès à la vue principale. C’est la page de synthèse qui permet de voir l’état de la saison en cours.

Dans la section **Analyses**, on retrouve les vues :
**Hebdomadaire**, pour suivre les données semaine par semaine.
**Mensuel**, pour prendre du recul sur les tendances par mois.
**Cumulé**, pour comparer l’accumulation de charge, d’heures, de distance ou de dénivelé entre les saisons.
**PMC**, pour suivre la forme avec les indicateurs CTL, ATL et TSB.

Dans la section **Données**, on retrouve :
**Activités**, pour consulter les sorties importées depuis Garmin.
**Imports**, pour suivre l’historique des fichiers importés.

Enfin, dans la section **Performance**, on peut imaginer deux vues supplémentaires :
**Records**, pour afficher les meilleures semaines, meilleurs mois ou plus grosses sorties.
**Projections**, pour estimer la fin de saison si le rythme actuel continue.

En haut du dashboard, plusieurs cartes KPI donnent une vue immédiate de la saison en cours :
**TSS saison**, **heures**, **distance**, **dénivelé positif** et **forme actuelle**.

Chaque carte indique la valeur actuelle et l’évolution par rapport à la saison précédente au même point. Par exemple, le TSS, les heures ou la distance peuvent être comparés à la même semaine de la saison précédente, afin d’éviter de comparer une saison incomplète avec une saison terminée.

La zone centrale contient les graphiques principaux. L’idée est de superposer les saisons sur le même axe temporel. L’axe horizontal représente la progression de la saison, de novembre à octobre. Chaque courbe correspond à une saison différente.

Dans l’onglet **Hebdomadaire**, on affiche les données semaine par semaine avec une moyenne mobile, afin de lisser les variations :
TSS hebdo, heures hebdo, distance hebdo et dénivelé hebdo.

Dans l’onglet **Mensuel**, les mêmes indicateurs sont regroupés par mois pour une lecture plus synthétique.

Dans l’onglet **Cumulé**, on visualise la progression totale de la saison :
TSS cumulé, heures cumulées, distance cumulée et dénivelé cumulé.

Enfin, la partie **PMC - Charge d’entraînement** affiche trois courbes importantes :
**CTL**, qui représente la charge chronique ou le niveau de fitness.
**ATL**, qui représente la fatigue récente.
**TSB**, qui représente la forme ou fraîcheur, calculée à partir de CTL moins ATL.

L’objectif final est d’obtenir un mini TrainingPeaks personnalisé : simple à utiliser, connecté aux exports Garmin, centré sur la comparaison de saisons et capable de montrer rapidement si la saison actuelle est en avance, en retard ou mieux structurée que les saisons précédentes.
