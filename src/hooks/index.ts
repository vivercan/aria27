/**
 * ARIA27 ERP React Hooks
 *
 * Central export point for all shared React hooks used across the application.
 * These hooks encapsulate common patterns for state management and form handling.
 */

export { useFlashMessage } from '@/lib/use-flash-message';
export type { FlashMsg } from '@/lib/use-flash-message';

export { useEntityForm } from './useEntityForm';
export type { UseEntityFormReturn } from './useEntityForm';

export { useObrasCatalogo } from './useObrasCatalogo';
export type { ObraCatalogo } from './useObrasCatalogo';
