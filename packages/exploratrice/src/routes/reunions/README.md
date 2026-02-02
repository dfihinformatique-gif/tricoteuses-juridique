# Route /reunions

Cette route affiche toutes les réunions des Tricoteuses récupérées depuis Grist.

## Fichiers

- `+page.server.ts` : Charge les données depuis Grist
- `+page.svelte` : Affiche les réunions

## Données chargées

```typescript
{
  meetings: TricoteusesMeeting[]
}
```

Où `TricoteusesMeeting` est défini dans `src/lib/server/grist.ts`:

```typescript
interface TricoteusesMeeting {
  Date: string       // Format ISO (YYYY-MM-DD)
  Heure?: string     // Format libre (ex: "19h30")
  Lieu?: string      // Lieu de la réunion
  Description?: string // Description ou ordre du jour
  Lien?: string      // URL vers plus d'informations
}
```

## Source des données

Les données proviennent de l'API Grist:
- Instance: https://grist.code4code.eu
- Document ID: `fxFbRXnFuMSc3hMtymP6h3`
- Table: `Reunions`

## Fonctionnement

1. Le serveur appelle `getAllTricoteusesMeetings()` depuis `grist.ts`
2. Les réunions sont récupérées via l'API Grist
3. Les réunions sont triées par date (plus récente en premier)
4. Les données sont passées au composant Svelte
5. Le composant sépare les réunions futures et passées
6. L'affichage est adapté selon le statut de la réunion

## Styling

- **Prochaines réunions** : bordure et fond primaire, effet hover
- **Réunions passées** : style atténué, opacité réduite

## Modification

Pour modifier l'affichage, éditez `+page.svelte`.
Pour modifier la logique de chargement, éditez `+page.server.ts`.
