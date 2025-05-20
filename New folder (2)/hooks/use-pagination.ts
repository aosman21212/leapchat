"use client"

import { useState } from "react"

interface UsePaginationProps {
  totalItems: number
  initialPage?: number
  itemsPerPage?: number
  siblingsCount?: number
}

export function usePagination({
  totalItems,
  initialPage = 1,
  itemsPerPage = 10,
  siblingsCount = 1,
}: UsePaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Ensure current page is within valid range
  if (currentPage < 1) {
    setCurrentPage(1)
  } else if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages)
  }

  // Calculate start and end item indices
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1)

  // Generate page numbers to display
  const generatePagination = () => {
    // Always show first page, last page, current page, and siblings
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

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return {
    currentPage,
    totalPages,
    pageNumbers,
    startIndex,
    endIndex,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    itemsPerPage,
    setItemsPerPage: (newItemsPerPage: number) => {
      const newTotalPages = Math.ceil(totalItems / newItemsPerPage)
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages || 1)
      }
    },
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}
