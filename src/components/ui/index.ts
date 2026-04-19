/**
 * ARIA27 UI primitives (PL32 17-Abr-2026).
 *
 * Canon de componentes compartidos. Uso:
 *   import { PageHeader, EmptyState, LoadingSpinner, Modal, Button, ResponsiveTable } from "@/components/ui";
 *
 * 19-Abr-2026 mobile-f3: ResponsiveTable añadido como 6ta primitiva canónica
 * — tabla HTML en desktop, cards sub-md con Modal detalle.
 */

export { default as PageHeader, type PageHeaderProps } from "./PageHeader";
export { default as EmptyState, type EmptyStateProps } from "./EmptyState";
export { default as LoadingSpinner, type LoadingSpinnerProps } from "./LoadingSpinner";
export { default as Modal, type ModalProps } from "./Modal";
export { default as Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./Button";
export { default as PromptModal, type PromptModalProps } from "./PromptModal";
export { default as ResponsiveTable, type ResponsiveTableProps, type ResponsiveTableColumn } from "./ResponsiveTable";
