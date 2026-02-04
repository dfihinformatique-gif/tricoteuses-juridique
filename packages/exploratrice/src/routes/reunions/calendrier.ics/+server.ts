import { getAllTricoteusesMeetings } from "$lib/server/grist.js"
import { generateFullCalendar } from "$lib/ical.js"
import publicConfig from "$lib/public_config.js"
import type { RequestHandler } from "./$types.js"

/**
 * Endpoint API pour générer un calendrier iCalendar (.ics) avec toutes les réunions
 *
 * Ce calendrier peut être utilisé pour s'abonner dans :
 * - NextCloud (Calendrier → Nouvel abonnement → Lien)
 * - Thunderbird (Calendrier → Nouveau calendrier → Sur le réseau → iCalendar (ICS))
 * - DavX (Android)
 * - Apple Calendar
 * - Google Calendar
 * - Tout autre client compatible iCalendar/CalDAV
 *
 * URL d'abonnement : https://votre-domaine.fr/reunions/calendrier.ics
 */
export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    // Récupérer toutes les réunions depuis Grist
    const meetings = await getAllTricoteusesMeetings()

    // Générer le calendrier iCal complet
    const icalContent = generateFullCalendar(meetings, publicConfig.title)

    // Générer un nom de fichier basé sur le titre (en retirant les caractères spéciaux)
    const safeFilename = publicConfig.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Définir les headers HTTP appropriés pour un calendrier iCal
    setHeaders({
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${safeFilename}.ics"`,
      // Permet la mise en cache pendant 1 heure
      "Cache-Control": "public, max-age=3600",
      // Headers CORS pour permettre l'accès depuis d'autres domaines
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    })

    // Retourner le contenu iCal
    return new Response(icalContent, {
      status: 200,
    })
  } catch (error) {
    console.error("Error generating calendar:", error)

    return new Response(
      JSON.stringify({
        error: "Failed to generate calendar",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
