import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Usamos las variables de entorno configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Definición de tipos de la tabla Productos
export interface Product {
  id: number;
  sku: string;
  category: string;
  subcategory: string;
  name: string;
  short_description: string;
  long_description: string;
  unit: string;
  commercial_presentation: string;
  type: string;
}

/**
 * Hook para cargar productos y manejar la lógica de búsqueda en el catálogo.
 * @param searchQuery El texto que el usuario está escribiendo en el buscador.
 */
export function useProducts(searchQuery: string) {
  const [Productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener todos los productos
  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Intenta traer todos los productos
      const { data, error } = await supabase
        .from('Productos')
        .select('*');

      if (error) {
        throw new Error(error.message);
      }
      
      setProductos(data || []);

    } catch (err: any) {
      console.error("Error al cargar productos:", err.message);
      setError("No se pudieron cargar los productos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga los productos al montar el componente
  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Lógica de filtrado/búsqueda
  const filteredProductos = useMemo(() => {
    if (!searchQuery) {
      return Productos;
    }
    const query = searchQuery.toLowerCase();
    
    // Filtra por SKU, Nombre o Descripción
    return Productos.filter(product => 
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.short_description?.toLowerCase().includes(query)
    );
  }, [Productos, searchQuery]);

  // Retorna los resultados
  return { 
    Productos: filteredProductos, 
    loading, 
    error,
    refetch: fetchProductos // Permite recargar los datos manualmente si es necesario
  };
}
