/**
 * Utility functions for exporting data to different formats
 */

type ExportData = Record<string, any>[]

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(data: ExportData, filename: string) {
  if (!data.length) return

  // Get headers from the first item
  const headers = Object.keys(data[0])

  // Create CSV rows
  const csvRows = [
    // Header row
    headers.join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          // Handle values that need quotes (contain commas, quotes, or newlines)
          const value = row[header] === null || row[header] === undefined ? "" : row[header].toString()
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(","),
    ),
  ]

  // Combine rows into a single string
  const csvString = csvRows.join("\n")

  // Create a blob and download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Convert data to Excel format and trigger download
 * This is a simple implementation that creates a CSV with Excel-compatible formatting
 * For more advanced Excel features, you would use a library like exceljs or xlsx
 */
export function exportToExcel(data: ExportData, filename: string) {
  if (!data.length) return

  // Get headers from the first item
  const headers = Object.keys(data[0])

  // Create Excel-compatible CSV rows
  const excelRows = [
    // Header row
    headers.join("\t"),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] === null || row[header] === undefined ? "" : row[header].toString()
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join("\t"),
    ),
  ]

  // Combine rows into a single string
  const excelString = excelRows.join("\n")

  // Create a blob and download
  const blob = new Blob([excelString], { type: "application/vnd.ms-excel;charset=utf-8;" })
  downloadBlob(blob, `${filename}.xls`)
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
