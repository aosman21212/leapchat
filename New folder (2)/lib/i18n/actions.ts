"use server"

import fs from "fs/promises"
import path from "path"
import { revalidatePath } from "next/cache"

type TranslationsData = {
  en: Record<string, string>
  ar: Record<string, string>
}

/**
 * Updates the translations.ts file with new translation data
 */
export async function updateTranslationsFile(translations: TranslationsData) {
  try {
    // Format the translations as a TypeScript object
    const formattedTranslations = `export type Language = "en" | "ar"

export const translations = {
  en: ${formatTranslationObject(translations.en)},
  ar: ${formatTranslationObject(translations.ar)},
}

export function getTranslation(lang: Language, key: string, params?: Record<string, string | number>): string {
  const translation = translations[lang][key as keyof (typeof translations)[typeof lang]] || key

  if (params && typeof translation === "string") {
    return Object.entries(params).reduce((acc, [key, value]) => {
      return acc.replace(\`{\${key}}\`, String(value))
    }, translation)
  }

  return translation as string
}
`

    // Write to the translations.ts file
    const filePath = path.join(process.cwd(), "lib", "i18n", "translations.ts")
    await fs.writeFile(filePath, formattedTranslations, "utf8")

    // Revalidate paths to reflect changes
    revalidatePath("/dashboard/translations")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Failed to update translations file:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Helper function to format a translations object as a pretty-printed string
 */
function formatTranslationObject(obj: Record<string, string>): string {
  const entries = Object.entries(obj)
    .map(([key, value]) => {
      // Escape any quotes in the value
      const escapedValue = value.replace(/"/g, '\\"')
      return `    ${key}: "${escapedValue}"`
    })
    .join(",\n")

  return `{
${entries}
  }`
}

/**
 * Exports translations to a JSON file for download
 */
export async function exportTranslations(translations: TranslationsData) {
  try {
    // This function doesn't actually need to do anything server-side
    // The export is handled client-side by creating a blob and downloading it
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Imports translations from a JSON file
 */
export async function importTranslations(jsonData: string) {
  try {
    // Parse the JSON data
    const data = JSON.parse(jsonData) as TranslationsData

    // Validate the data structure
    if (!data.en || !data.ar) {
      throw new Error("Invalid translations format. Must include 'en' and 'ar' keys.")
    }

    // Update the translations file
    const result = await updateTranslationsFile(data)
    return result
  } catch (error) {
    console.error("Failed to import translations:", error)
    return { success: false, error: (error as Error).message }
  }
}
