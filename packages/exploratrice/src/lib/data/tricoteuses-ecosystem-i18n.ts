/**
 * Internationalisation des données de l'écosystème Tricoteuses
 * Fournit des fonctions pour obtenir les noms et descriptions traduits
 */

import * as m from "$lib/paraglide/messages.js"
import type {
  DataService,
  DataSource,
  Software,
} from "./tricoteuses-ecosystem.js"

/**
 * Retourne le nom traduit d'une source de données
 */
export function getDataSourceName(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_name` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne la description traduite d'une source de données
 */
export function getDataSourceDescription(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_description` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Retourne le nom traduit d'un fournisseur
 */
export function getProviderName(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_provider` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne le nom traduit d'un service de données
 */
export function getDataServiceName(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_name` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne la description traduite d'un service de données
 */
export function getDataServiceDescription(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_description` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Retourne le nom traduit d'un logiciel
 */
export function getSoftwareName(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_name` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne la description traduite d'un logiciel
 */
export function getSoftwareDescription(id: string): string {
  const key = `data_${id.replace(/-/g, "_")}_description` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Retourne la description traduite d'un projet externe
 */
export function getExternalProjectDescription(id: string): string {
  const key =
    `data_external_project_${id.replace(/-/g, "_")}_description` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Enrichit une source de données avec les traductions
 */
export function getLocalizedDataSource(dataSource: DataSource): DataSource {
  return {
    ...dataSource,
    name: getDataSourceName(dataSource.id),
    description: getDataSourceDescription(dataSource.id),
    provider: getProviderName(dataSource.id.replace("-opendata", "")),
  }
}

/**
 * Enrichit un service de données avec les traductions
 */
export function getLocalizedDataService(service: DataService): DataService {
  return {
    ...service,
    name: getDataServiceName(service.id),
    description: getDataServiceDescription(service.id),
    provider: service.provider
      ? {
          ...service.provider,
          name: service.provider.url.includes("code4code")
            ? (m.data_provider_code4code as () => string)()
            : service.provider.name,
        }
      : undefined,
  }
}

/**
 * Enrichit un logiciel avec les traductions
 */
export function getLocalizedSoftware(software: Software): Software {
  return {
    ...software,
    name: getSoftwareName(software.id),
    description: getSoftwareDescription(software.id),
  }
}

/**
 * Retourne le nom traduit d'une réutilisation
 */
export function getReuseName(id: string): string {
  const key = `data_reuse_${id.replace(/-/g, "_")}_name` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne la description traduite d'une réutilisation
 */
export function getReuseDescription(id: string): string {
  const key =
    `data_reuse_${id.replace(/-/g, "_")}_description` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Retourne l'auteur traduit d'une réutilisation
 */
export function getReuseAuthor(id: string): string {
  const key = `data_reuse_${id.replace(/-/g, "_")}_author` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}

/**
 * Retourne le nom traduit d'un projet externe
 */
export function getExternalProjectName(id: string): string {
  const key =
    `data_external_project_${id.replace(/-/g, "_")}_name` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : id
}

/**
 * Retourne l'auteur traduit d'un projet externe
 */
export function getExternalProjectAuthor(id: string): string {
  const key =
    `data_external_project_${id.replace(/-/g, "_")}_author` as keyof typeof m
  const fn = m[key]
  return typeof fn === "function" ? (fn as () => string)() : ""
}
