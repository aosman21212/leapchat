"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Search, SlidersHorizontal } from "lucide-react"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type Column<T> = {
  header: string
  accessorKey: keyof T
  cell?: (row: T) => React.ReactNode
  enableSorting?: boolean
  enableFiltering?: boolean
  meta?: {
    className?: string
    headerClassName?: string
    hidden?: boolean
    visibleFrom?: "sm" | "md" | "lg" | "xl" | "2xl"
  }
}

type SortDirection = "asc" | "desc" | null

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  title?: string
  description?: string
  searchPlaceholder?: string
  initialPageSize?: number
  pageSizeOptions?: number[]
  exportFilename?: string
  className?: string
  isLoading?: boolean
  onRefresh?: () => void
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  description,
  searchPlaceholder = "Search...",
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  exportFilename = "export",
  className,
  isLoading = false,
  onRefresh,
}: DataTableProps<T>) {
  // State for filtering, sorting, and pagination
  const [filteredData, setFilteredData] = useState<T[]>(data)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof T>>(
    new Set(columns.filter((col) => !col.meta?.hidden).map((col) => col.accessorKey)),
  )

  // Update filtered data when data, search, or sort changes
  useEffect(() => {
    let result = [...data]

    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase()
      result = result.filter((row) => {
        return columns.some((column) => {
          if (!column.enableFiltering && column.enableFiltering !== undefined) return false
          const value = row[column.accessorKey]
          if (value == null) return false
          return String(value).toLowerCase().includes(lowerCaseQuery)
        })
      })
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (aValue == null) return sortDirection === "asc" ? -1 : 1
        if (bValue == null) return sortDirection === "asc" ? 1 : -1

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        }

        return sortDirection === "asc" ? (aValue > bValue ? 1 : -1) : aValue > bValue ? -1 : 1
      })
    }

    setFilteredData(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [data, searchQuery, sortColumn, sortDirection, columns])

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize - 1, filteredData.length - 1)
  const currentData = filteredData.slice(startIndex, endIndex + 1)

  // Generate page numbers for pagination
  const generatePagination = () => {
    const siblingsCount = 1
    const pageNumbers = []

    // Calculate range of pages to show
    const leftSiblingIndex = Math.max(currentPage - siblingsCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingsCount, totalPages)

    // Whether to show ellipsis
    const showLeftDots = leftSiblingIndex > 2
    const showRightDots = rightSiblingIndex < totalPages - 1

    // Always show page 1
    if (currentPage > 1) {
      pageNumbers.push(1)
    }

    // Show left ellipsis if needed
    if (showLeftDots) {
      pageNumbers.push("ellipsis-left")
    }

    // Add pages in range [leftSiblingIndex, rightSiblingIndex]
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== totalPages) {
        // Skip first and last page as they're always shown
        pageNumbers.push(i)
      }
    }

    // Show right ellipsis if needed
    if (showRightDots) {
      pageNumbers.push("ellipsis-right")
    }

    // Always show last page
    if (currentPage < totalPages) {
      pageNumbers.push(totalPages)
    }

    return pageNumbers
  }

  const pageNumbers = generatePagination()

  // Handle sorting
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortDirection(null)
        setSortColumn(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Handle column visibility toggle
  const toggleColumnVisibility = (column: keyof T) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(column)) {
        newSet.delete(column)
      } else {
        newSet.add(column)
      }
      return newSet
    })
  }

  // Export functions
  const handleExportCSV = () => {
    exportToCSV(filteredData, exportFilename)
  }

  const handleExportExcel = () => {
    exportToExcel(filteredData, exportFilename)
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>Export as Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {columns.map((column) => (
                    <DropdownMenuItem
                      key={`column-toggle-${String(column.accessorKey)}`}
                      onClick={() => toggleColumnVisibility(column.accessorKey)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.accessorKey)}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        {column.header}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={`page-size-${size}`} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns
                  .filter((column) => visibleColumns.has(column.accessorKey))
                  .map((column) => (
                    <TableHead
                      key={`header-${String(column.accessorKey)}`}
                      className={cn(
                        column.meta?.headerClassName,
                        column.enableSorting && "cursor-pointer select-none",
                        column.meta?.visibleFrom && `hidden ${column.meta.visibleFrom}:table-cell`
                      )}
                      onClick={() => column.enableSorting && handleSort(column.accessorKey)}
                    >
                      <div className="flex items-center gap-1">
                        {column.header}
                        {column.enableSorting && (
                          <span className="ml-1">
                            {sortColumn === column.accessorKey ? (
                              sortDirection === "asc" ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : sortDirection === "desc" ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : null
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}-${String(row.id || rowIndex)}`}>
                    {columns
                      .filter((column) => visibleColumns.has(column.accessorKey))
                      .map((column) => (
                        <TableCell
                          key={`cell-${String(column.accessorKey)}-${rowIndex}`}
                          className={cn(
                            column.meta?.className,
                            column.meta?.visibleFrom && `hidden ${column.meta.visibleFrom}:table-cell`
                          )}
                        >
                          {column.cell ? column.cell(row) : String(row[column.accessorKey] ?? "")}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex + 1} of {filteredData.length} results
          </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  />
                </PaginationItem>

              {pageNumbers.map((page, index) => {
                if (page === "ellipsis-left" || page === "ellipsis-right") {
                  return (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }

                return (
                  <PaginationItem key={`page-${page}`}>
                      <PaginationLink
                      onClick={() => setCurrentPage(Number(page))}
                      isActive={currentPage === page}
                      >
                      {page}
                      </PaginationLink>
                  </PaginationItem>
                )
              })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}
