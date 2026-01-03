'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import React from 'react';

// Se asume que este es el componente principal que renderiza la vista de Requisiciones
export default function RequisitionPage() {
    // Lógica del Catálogo y Búsqueda
    const [searchQuery, setSearchQuery] = useState('');
    const { Productos, loading } = useProducts(searchQuery);

    // Componente que renderiza la tabla de resultados del catálogo
    const CatalogoResultado = () => {
        if (loading) return <p className="text-gray-400">Cargando catálogo (2483 artículos)...</p>;
        if (Productos.length === 0 && searchQuery.length > 0) return <p className="text-red-400">No se encontraron productos para "{searchQuery}".</p>;
        if (Productos.length === 0 && searchQuery.length === 0) return <p className="text-gray-400">Escriba para buscar artículos en el catálogo.</p>;

        return (
            <div className="mt-4 border border-gray-700 p-4 rounded-lg">
                <h4 className="text-white text-lg mb-2">Resultados de Catálogo ({Productos.length})</h4>
                <table className="min-w-full divide-y divide-gray-700 text-sm text-white">
                    <thead><tr><th className="px-6 py-3 text-left text-gray-400">SKU</th><th className="px-6 py-3 text-left text-gray-400">Nombre Producto</th><th className="px-6 py-3 text-left text-gray-400">Unidad</th><th className="px-6 py-3 text-left text-gray-400">Acción</th></tr></thead>
                    <tbody>
                        {Productos.slice(0, 10).map((product) => (
                            <tr key={product.id} className="hover:bg-gray-800">
                                <td className="px-6 py-2">{product.sku}</td>
                                <td className="px-6 py-2">{product.name}</td>
                                <td className="px-6 py-2">{product.unit}</td>
                                <td className="px-6 py-2"><button className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-xs">Agregar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };


    return (
        <div className="flex flex-col md:flex-row p-6 bg-gray-900 min-h-screen text-white">
            
            <div className="flex flex-col w-full md:w-1/2 p-4">
                <h2 className="text-2xl font-bold mb-6">Nueva Requisición</h2>
                <p className="mb-6 text-gray-400">Agrega productos del catálogo o partidas manuales.</p>

                {/* 1. CONFIGURACIÓN */}
                <div className="mb-8 p-6 bg-gray-800 rounded-lg shadow-xl">
                    <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">1. CONFIGURACIÓN</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300">Obra / Centro de Costos</label>
                        <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white">
                            <option>Seleccione una obra...</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Comentarios Generales</label>
                        <textarea rows={3} className="mt-1 block w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white" placeholder="Instrucciones generales..."></textarea>
                    </div>
                </div>

            </div>

            {/* 2. LISTA DE MATERIALES (Catálogo Inyectado) */}
            <div className="flex flex-col w-full md:w-1/2 p-4">
                <div className="p-6 bg-gray-800 rounded-lg shadow-xl">
                    <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 uppercase tracking-wider">2. LISTA DE MATERIALES</h3>
                    
                    {/* Input de Búsqueda Conectado */}
                    <div className="mb-4 flex items-center bg-gray-700 p-2 rounded-lg">
                        <span className="text-gray-400">Q</span>
                        <input
                            type="text"
                            placeholder="Busca productos por SKU o nombre, ej: cemento"
                            className="ml-2 w-full bg-transparent focus:outline-none text-white"
                            value={searchQuery}
                            // CONEXIÓN CLAVE PARA QUE EL HOOK FUNCIONE
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>

                    {/* Resultados del Catálogo - Llamada al Componente Inyectado */}
                    <div className="min-h-[300px]">
                        <CatalogoResultado />
                    </div>
                    
                    <button className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Finalizar Requisición
                    </button>
                </div>
            </div>

        </div>
    );
}