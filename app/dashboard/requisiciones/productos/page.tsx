"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Package, ChevronRight,
  Truck, Tag, Box, Loader2, X, Plus, FileSpreadsheet, Building2,
  Upload, Sparkles, Save, Check, AlertCircle
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Product { id:number; sku:string; name:string; description:string|null; unit:string; category:string|null; }
interface SupplierInfo { id:number; name:string; }
interface SupplierOption { id:number; name:string; }
const PAGE_SIZE = 50;
const UNITS = ["PIEZA","LITRO","METRO","METRO_CUBICO","METRO_CUADRADO","KILO","TONELADA","SACO","CUBETA_19L","ROLLO","TRAMO","JUEGO","PAR","CAJA","PAQUETE","VIAJE","SERVICIO","GLOBAL","LOTE","GALON","BOLSA","BOTE"];

export default function ProductosPage() {
  const log = clientLogger("PRODUCTOS");
  const { msg, flash, clear } = useFlashMessage();
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [debouncedSearch,setDebouncedSearch]=useState("");
  const [category,setCategory]=useState("");
  const [categories,setCategories]=useState<string[]>([]);
  const [totalCount,setTotalCount]=useState(0);
  const [currentPage,setCurrentPage]=useState(1);
  const [supplierMap,setSupplierMap]=useState<Record<number,SupplierInfo[]>>({});
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [productSuppliers,setProductSuppliers]=useState<any[]>([]);
  const [loadingDetail,setLoadingDetail]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [showExportMenu,setShowExportMenu]=useState(false);
  const searchTimeout=useRef<NodeJS.Timeout>(null);

  // Modal Nuevo Producto
  const [showNewModal,setShowNewModal]=useState(false);
  const [newForm,setNewForm]=useState({sku:"",name:"",description:"",unit:"PIEZA",category:"",supplierId:""});
  const [savingNew,setSavingNew]=useState(false);
  const [skuError,setSkuError]=useState("");
  const [allSuppliers,setAllSuppliers]=useState<SupplierOption[]>([]);

  // Modal Upload Catálogo IA
  const [showUploadModal,setShowUploadModal]=useState(false);
  const [uploadFile,setUploadFile]=useState<File|null>(null);
  const [uploadSuppId,setUploadSuppId]=useState("");
  const [parsing,setParsing]=useState(false);
  const [parsedProducts,setParsedProducts]=useState<any[]>([]);
  const [savingParsed,setSavingParsed]=useState(false);
  const [savedCount,setSavedCount]=useState(0);
  const [parseError,setParseError]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(()=>{
    if(searchTimeout.current)clearTimeout(searchTimeout.current);
    searchTimeout.current=setTimeout(()=>setDebouncedSearch(search),300);
    return ()=>{if(searchTimeout.current)clearTimeout(searchTimeout.current);};
  },[search]);

  useEffect(()=>{
    const load=async()=>{
      let all:string[]=[];let from=0;
      while(true){const{data}=await supabase.from("products").select("category").not("category","is",null).range(from,from+999);if(!data||data.length===0)break;all=all.concat(data.map(d=>d.category).filter(Boolean));if(data.length<1000)break;from+=1000;}
      setCategories([...new Set(all)].sort());
    };
    load();
    // Load suppliers for dropdowns
    supabase.from("suppliers").select("id,name").order("name").then(({data})=>{if(data)setAllSuppliers(data);});
  },[]);

  const loadProducts=useCallback(async(page:number)=>{
    setLoading(true);const from=(page-1)*PAGE_SIZE;const to=from+PAGE_SIZE-1;
    let query=supabase.from("products").select("id,sku,name,description,unit,category",{count:"exact"}).order("name").range(from,to);
    if(category)query=query.eq("category",category);
    if(debouncedSearch.trim()){const t=debouncedSearch.trim();query=query.or(`name.ilike.%${t}%,sku.ilike.%${t}%,description.ilike.%${t}%`);}
    const{data,count}=await query;
    if(data){setProducts(data);setTotalCount(count||0);
      const ids=data.map(p=>p.id);
      if(ids.length>0){const{data:psData}=await supabase.from("product_suppliers").select("product_id,suppliers(id,name)").in("product_id",ids);
        if(psData){const map:Record<number,SupplierInfo[]>={};psData.forEach((ps:any)=>{if(!map[ps.product_id])map[ps.product_id]=[];const s=ps.suppliers;if(s&&!map[ps.product_id].find((x:SupplierInfo)=>x.id===s.id))map[ps.product_id].push({id:s.id,name:s.name});});setSupplierMap(map);}
      }
    }
    setLoading(false);
  },[debouncedSearch,category]);

  useEffect(()=>{setCurrentPage(1);loadProducts(1);},[debouncedSearch,category,loadProducts]);
  const totalPages=Math.ceil(totalCount/PAGE_SIZE);
  const goToPage=(p:number)=>{if(p>=1&&p<=totalPages){setCurrentPage(p);loadProducts(p);}};

  const openDetail=async(product:Product)=>{
    setSelectedProduct(product);setLoadingDetail(true);
    const{data}=await supabase.from("product_suppliers").select("supplier_id,precio_referencia,tiempo_entrega_dias,es_proveedor_preferido,suppliers(id,name,phone,email,ciudad,estado,whatsapp,credit_days,razon_social)").eq("product_id",product.id);
    setProductSuppliers(data||[]);setLoadingDetail(false);
  };

  const exportToExcel=async(mode:"all"|"category")=>{
    setExporting(true);setShowExportMenu(false);
    let all:any[]=[];let from=0;
    while(true){let q=supabase.from("products").select("sku,name,description,unit,category").order("category").order("name").range(from,from+999);
      if(mode==="category"&&category)q=q.eq("category",category);
      if(debouncedSearch.trim())q=q.or(`name.ilike.%${debouncedSearch.trim()}%,sku.ilike.%${debouncedSearch.trim()}%`);
      const{data}=await q;if(!data||data.length===0)break;all=all.concat(data);if(data.length<1000)break;from+=1000;
    }
    const rows=all.map((p:any)=>({SKU:p.sku||"",NOMBRE:p.name||"",DESCRIPCIÓN:p.description||"",UNIDAD:p.unit||"",CATEGORÍA:p.category||""}));
    const ws=XLSX.utils.json_to_sheet(rows);ws["!cols"]=[{wch:14},{wch:45},{wch:35},{wch:14},{wch:28}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,mode==="category"&&category?category.substring(0,31):"Catálogo completo");
    XLSX.writeFile(wb,mode==="category"&&category?`catalogo_${category.replace(/\s/g,"_")}_${new Date().toISOString().split("T")[0]}.xlsx`:`catalogo_aria27_completo_${new Date().toISOString().split("T")[0]}.xlsx`);
    setExporting(false);
  };

  // === FASE 3: Nuevo Producto ===
  const checkSku=async(sku:string)=>{
    if(!sku.trim()){setSkuError("");return;}
    const{data}=await supabase.from("products").select("id").eq("sku",sku.trim()).limit(1);
    setSkuError(data&&data.length>0?"SKU ya existe":"");
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newForm.name?.trim()) errors.name = "El nombre es obligatorio";
    if (!newForm.sku?.trim()) errors.sku = "El SKU es obligatorio";
    if (skuError) errors.sku = skuError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNewProduct=async()=>{
    if (!validar()) return;
    setSavingNew(true);
    try{
      const{data:inserted,error}=await supabase.from("products").insert({
        sku:newForm.sku.trim().toUpperCase(),name:newForm.name.trim(),description:newForm.description.trim()||null,
        unit:newForm.unit,category:newForm.category.trim()||null
      }).select("id").single();
      if(error)throw error;
      if(inserted&&newForm.supplierId){
        const { error: psErr } = await supabase.from("product_suppliers").insert({product_id:inserted.id,supplier_id:parseInt(newForm.supplierId)});
        if (psErr) { flash("err", "Producto creado, pero error al vincular proveedor: " + psErr.message); }
      }
      setShowNewModal(false);setNewForm({sku:"",name:"",description:"",unit:"PIEZA",category:"",supplierId:""});
      loadProducts(currentPage);
    }catch(e:unknown){log.error(String(e));flash("err", "Error: "+(e as Error)?.message);}
    finally{setSavingNew(false);}
  };

  // === FASE 5: Upload Catálogo IA ===
  const handleUploadParse=async()=>{
    if(!uploadFile||!uploadSuppId)return;
    setParsing(true);setParseError("");setParsedProducts([]);
    try{
      const base64=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve((reader.result as string).split(",")[1]);
        reader.onerror=()=>reject(new Error("Error leyendo archivo"));
        reader.readAsDataURL(uploadFile);
      });
      const suppName=allSuppliers.find(s=>s.id===parseInt(uploadSuppId))?.name||"";
      const res=await fetch("/api/ai",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          prompt:`Analiza este catálogo/cotización del proveedor "${suppName}" y extrae TODOS los productos listados.
Para cada producto devuelve un JSON array con objetos que tengan: name (nombre del producto), sku (código si aparece, o genera uno con prefijo MATE-), unit (unidad: PIEZA, LITRO, METRO, KILO, SACO, etc), category (categoría general del producto), price (precio unitario si aparece, null si no), description (descripción breve).
IMPORTANTE: Responde SOLO con el JSON array, sin texto adicional, sin markdown, sin backticks. Solo el array JSON puro.`,
          image:base64,
          mimeType:uploadFile.type||"image/png"
        })
      });
      if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||`Error ${res.status}`);}
      const result=await res.json();
      let text=result.response||result.text||"";
      text=text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      const parsed=JSON.parse(text);
      if(!Array.isArray(parsed))throw new Error("La IA no devolvió un array");
      setParsedProducts(parsed);
    }catch(e:unknown){
      log.error("Error parsing:", { data: e });
      setParseError((e as Error)?.message||"Error procesando el archivo");
    }finally{setParsing(false);}
  };

  const saveParsedProducts=async()=>{
    if(parsedProducts.length===0||!uploadSuppId)return;
    setSavingParsed(true);setSavedCount(0);
    let saved=0;
    for(const p of parsedProducts){
      try{
        const sku=p.sku||(p.name?.substring(0,4).toUpperCase()+"-"+Math.random().toString(36).substring(2,6).toUpperCase());
        const{data:existing}=await supabase.from("products").select("id").eq("sku",sku).limit(1);
        let productId:number;
        if(existing&&existing.length>0){
          productId=existing[0].id;
        }else{
          const{data:ins,error}=await supabase.from("products").insert({
            sku,name:p.name||"Sin nombre",description:p.description||null,unit:p.unit||"PIEZA",category:p.category||null
          }).select("id").single();
          if(error)continue;
          productId=ins.id;
        }
        // Link to supplier
        const{data:existLink}=await supabase.from("product_suppliers").select("id").eq("product_id",productId).eq("supplier_id",parseInt(uploadSuppId)).limit(1);
        if(!existLink||existLink.length===0){
          const { error: psErr } = await supabase.from("product_suppliers").insert({
            product_id:productId,supplier_id:parseInt(uploadSuppId),
            precio_referencia:p.price||null
          });
          if (psErr) { log.error("Error link product_supplier:", { data: psErr }); continue; }
        }
        saved++;setSavedCount(saved);
      }catch (e: unknown){log.error("Error saving product:", { data: e });}
    }
    setSavingParsed(false);
    setTimeout(()=>{setShowUploadModal(false);setParsedProducts([]);setUploadFile(null);setUploadSuppId("");setSavedCount(0);loadProducts(currentPage);},1500);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      {/* HEADER */}
      <div className="flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/requisiciones" className="p-1 hover:bg-white/[0.06] rounded-lg"><ArrowLeft className="w-4 h-4 text-[#7f93b0]"/></Link>
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-aria-accent"/>Catálogo de Productos</h1>
            <span className="text-xs text-[#4a6080] ml-1">{loading?"...": `${totalCount.toLocaleString()} productos`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={()=>setShowUploadModal(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30" title="Subir catálogo de proveedor"><Upload className="w-3 h-3"/>Importar</button>
            <div className="relative">
              <button onClick={()=>setShowExportMenu(!showExportMenu)} disabled={exporting}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-white/[0.05] border border-white/[0.08] text-[#c9d8ed] rounded-lg hover:bg-white/[0.1] disabled:opacity-50">
                {exporting?<Loader2 className="w-3 h-3 animate-spin"/>:<FileSpreadsheet className="w-3 h-3"/>}Exportar
              </button>
              {showExportMenu&&(<div className="absolute right-0 top-full mt-1 bg-[#0c1d38] border border-white/[0.1] rounded-lg shadow-xl z-20 min-w-[180px] py-1">
                <button onClick={()=>exportToExcel("all")} className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/[0.08]">Catálogo completo</button>
                {category&&<button onClick={()=>exportToExcel("category")} className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/[0.08]">Solo: {category}</button>}
              </div>)}
            </div>
            <button onClick={()=>setShowNewModal(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-aria-accent-bg text-aria-accent rounded-lg hover:bg-aria-accent/30"><Plus className="w-3 h-3"/>Nuevo</button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a6080]"/>
            <input type="text" placeholder="Buscar nombre, SKU..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:border-aria-accent/50 outline-none"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#7f93b0]"/></button>}
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none cursor-pointer min-w-[180px]">
            <option value="">Todas ({categories.length})</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto min-h-0" onClick={()=>showExportMenu&&setShowExportMenu(false)}>
        {loading?(<div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-aria-accent"/><span className="ml-2 text-[#7f93b0] text-sm">Cargando...</span></div>
        ):products.length===0?(<div className="text-center py-12"><Package className="w-8 h-8 text-[#4a6080] mx-auto mb-2"/><p className="text-[#7f93b0] text-sm">Sin resultados</p></div>
        ):(
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[rgba(4,8,16,0.98)]  border-b border-white/[0.06] text-[10px] text-[#4a6080] font-semibold uppercase tracking-wider">
                <th className="text-left pl-4 py-1.5 w-[100px]">SKU</th>
                <th className="text-left py-1.5 w-[40%]">Nombre</th>
                <th className="text-left py-1.5">Categoría</th>
                <th className="text-left py-1.5 w-[55px]">Unidad</th>
                <th className="text-left py-1.5">Proveedores</th>
                <th className="w-[24px]"></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {products.map(p=>{const supps=supplierMap[p.id]||[];return(
                <tr key={p.id} onClick={()=>openDetail(p)} className="border-b border-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors group h-[30px]">
                  <td className="pl-4 text-[#4a6080] font-mono text-[11px]">{p.sku||"—"}</td>
                  <td className="text-white group-hover:text-aria-accent transition-colors pr-2">{p.name}</td>
                  <td>{p.category&&<span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded text-[#7f93b0]">{p.category}</span>}</td>
                  <td className="text-[#7f93b0]">{p.unit}</td>
                  <td>{supps.length>0?(<div className="flex gap-1 items-center">{supps.slice(0,2).map(s=>(<span key={s.id} className="text-[10px] px-1 py-0.5 bg-emerald-500/10 text-emerald-400 rounded truncate max-w-[100px]" title={s.name}>{s.name.length>14?s.name.substring(0,14)+"…":s.name}</span>))}{supps.length>2&&<span className="text-[10px] text-[#4a6080]">+{supps.length-2}</span>}</div>):<span className="text-[10px] text-[#4a6080]">—</span>}</td>
                  <td className="pr-2"><ChevronRight className="w-3 h-3 text-[#4a6080] group-hover:text-[#7f93b0]"/></td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages>1&&(<div className="flex-none px-4 py-1.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
        <span className="text-[#4a6080]">{((currentPage-1)*PAGE_SIZE)+1}–{Math.min(currentPage*PAGE_SIZE,totalCount)} de {totalCount.toLocaleString()}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={()=>goToPage(1)} disabled={currentPage===1} className="px-1.5 py-0.5 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded disabled:opacity-30">«</button>
          <button onClick={()=>goToPage(currentPage-1)} disabled={currentPage===1} className="px-1.5 py-0.5 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded disabled:opacity-30">‹</button>
          {Array.from({length:Math.min(5,totalPages)},(_,i)=>{let p:number;if(totalPages<=5)p=i+1;else if(currentPage<=3)p=i+1;else if(currentPage>=totalPages-2)p=totalPages-4+i;else p=currentPage-2+i;return<button key={p} onClick={()=>goToPage(p)} className={`w-6 h-6 rounded ${p===currentPage?"bg-aria-accent-bg text-aria-accent font-bold":"text-[#7f93b0] hover:bg-white/[0.06]"}`}>{p}</button>;})}
          <button onClick={()=>goToPage(currentPage+1)} disabled={currentPage===totalPages} className="px-1.5 py-0.5 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded disabled:opacity-30">›</button>
          <button onClick={()=>goToPage(totalPages)} disabled={currentPage===totalPages} className="px-1.5 py-0.5 text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded disabled:opacity-30">»</button>
        </div>
        <span className="text-[#4a6080]">Pág {currentPage}/{totalPages}</span>
      </div>)}

      {/* PANEL DETALLE PRODUCTO */}
      {selectedProduct&&(
        <div className="fixed inset-0 z-50 flex justify-end" onClick={()=>setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/40 "/>
          <div className="relative w-full max-w-md bg-[#0a1628] border-l border-white/[0.08] h-full overflow-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-[rgba(4,8,16,0.98)]  border-b border-white/[0.06] p-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-aria-accent font-mono">{selectedProduct.sku}</p>
                  <h2 className="text-base font-bold text-white leading-tight mt-0.5">{selectedProduct.name}</h2>
                  {selectedProduct.description&&<p className="text-xs text-[#7f93b0] mt-0.5">{selectedProduct.description}</p>}
                </div>
                <button onClick={()=>setSelectedProduct(null)} className="p-1.5 hover:bg-white/[0.06] rounded-lg ml-2"><X className="w-4 h-4 text-[#7f93b0]"/></button>
              </div>
              <div className="flex gap-1.5 mt-2">
                {selectedProduct.category&&<span className="text-[10px] px-1.5 py-0.5 bg-aria-primary/10 text-aria-accent rounded flex items-center gap-1"><Tag className="w-2.5 h-2.5"/>{selectedProduct.category}</span>}
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/10 text-[#7f93b0] rounded flex items-center gap-1"><Box className="w-2.5 h-2.5"/>{selectedProduct.unit}</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2"><Truck className="w-3.5 h-3.5 text-emerald-400"/>Proveedores<span className="ml-auto text-[10px] text-[#4a6080]">{loadingDetail?"...":productSuppliers.length}</span></h3>
              {loadingDetail?(<div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-aria-accent"/></div>
              ):productSuppliers.length===0?(<div className="text-center py-4 bg-white/[0.02] rounded-lg border border-white/[0.04]"><Truck className="w-6 h-6 text-[#4a6080] mx-auto mb-1"/><p className="text-[#4a6080] text-xs">Sin proveedores</p></div>
              ):(<div className="space-y-1.5">{productSuppliers.map((ps:any,idx:number)=>(<div key={idx} className={`p-2.5 rounded-lg border ${ps.es_proveedor_preferido?"bg-emerald-500/[0.06] border-emerald-500/20":"bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5 text-emerald-400"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-xs flex items-center gap-1">{ps.suppliers?.name||"—"}{ps.es_proveedor_preferido&&<span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-400 rounded font-bold">PREF</span>}</p>
                    <p className="text-[10px] text-[#4a6080]">{[ps.suppliers?.ciudad,ps.suppliers?.estado].filter(Boolean).join(", ")||"—"}{ps.suppliers?.phone&&` · ${ps.suppliers.phone}`}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {ps.precio_referencia&&<p className="text-xs text-emerald-400 font-medium">${ps.precio_referencia.toLocaleString("es-MX",{minimumFractionDigits:2})}</p>}
                    {ps.tiempo_entrega_dias&&<p className="text-[10px] text-[#4a6080]">{ps.tiempo_entrega_dias}d</p>}
                  </div>
                </div>
              </div>))}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO (Fase 3) */}
      {showNewModal&&(
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-2xl w-full max-w-lg border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">Nuevo Producto</h2>
              <button onClick={()=>setShowNewModal(false)} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#7f93b0]"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#7f93b0] mb-0.5 block">SKU *</label>
                  <input value={newForm.sku} onChange={e=>{const v=e.target.value.toUpperCase();setNewForm(p=>({...p,sku:v}));checkSku(v);}}
                    className={`w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border rounded-lg text-white font-mono uppercase outline-none ${skuError?"border-red-500/50":"border-white/[0.08] focus:border-aria-accent/50"}`} placeholder="MATE-0001"/>
                  {skuError&&<p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5"/>{skuError}</p>}
                </div>
                <div>
                  <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Unidad</label>
                  <select value={newForm.unit} onChange={e=>setNewForm(p=>({...p,unit:e.target.value}))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none">
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Categoría</label>
                  <input value={newForm.category} onChange={e=>setNewForm(p=>({...p,category:e.target.value}))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none" placeholder="ACEROS" list="newcat-list"/>
                  <datalist id="newcat-list">{categories.map(c=><option key={c} value={c}/>)}</datalist>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Nombre del producto *</label>
                <input value={newForm.name} onChange={e=>setNewForm(p=>({...p,name:e.target.value}))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none focus:border-aria-accent/50" placeholder="Ej: Varilla corrugada 3/8 grado 42"/>
              </div>
              <div>
                <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Descripción</label>
                <input value={newForm.description} onChange={e=>setNewForm(p=>({...p,description:e.target.value}))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none" placeholder="Descripción breve"/>
              </div>
              <div>
                <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Proveedor (opcional)</label>
                <select value={newForm.supplierId} onChange={e=>setNewForm(p=>({...p,supplierId:e.target.value}))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none">
                  <option value="">Sin proveedor</option>
                  {allSuppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-white/[0.08]">
              <button onClick={()=>setShowNewModal(false)} className="px-3 py-1.5 text-xs text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded-lg">Cancelar</button>
              <button onClick={handleNewProduct} disabled={savingNew||!newForm.name.trim()||!newForm.sku.trim()||!!skuError}
                className="px-3 py-1.5 text-xs bg-aria-accent/80 hover:bg-aria-accent/80 disabled:bg-[#0f2448] text-white rounded-lg flex items-center gap-1">
                <Save className="w-3 h-3"/>{savingNew?"Guardando...":"Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD CATÁLOGO IA (Fase 5) */}
      {showUploadModal&&(
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-2xl w-full max-w-2xl border border-white/[0.08] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] flex-none">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">Importar Catálogo</h2>
              <button onClick={()=>{setShowUploadModal(false);setParsedProducts([]);setUploadFile(null);setParseError("");}} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#7f93b0]"><X className="w-4 h-4"/></button>
            </div>

            <div className="overflow-auto p-4 flex-1 space-y-4">
              {parsedProducts.length===0?(
                <>
                  <p className="text-xs text-[#7f93b0]">Sube una imagen o PDF del catálogo/cotización de un proveedor. La IA extraerá los productos automáticamente.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Proveedor *</label>
                      <select value={uploadSuppId} onChange={e=>setUploadSuppId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none">
                        <option value="">Seleccionar proveedor</option>
                        {allSuppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Archivo (imagen/PDF)</label>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e=>setUploadFile(e.target.files?.[0]||null)}
                        className="w-full text-xs text-[#7f93b0] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-violet-500/20 file:text-violet-400 hover:file:bg-violet-500/30"/>
                    </div>
                  </div>
                  {uploadFile&&(
                    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/[0.06] flex items-center gap-2">
                      <Upload className="w-4 h-4 text-violet-400"/>
                      <span className="text-xs text-white flex-1">{uploadFile.name}</span>
                      <span className="text-[10px] text-[#4a6080]">{(uploadFile.size/1024).toFixed(0)} KB</span>
                    </div>
                  )}
                  {parseError&&<div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{parseError}</div>}
                </>
              ):(
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400"/>{parsedProducts.length} productos encontrados</h3>
                    {savedCount>0&&<span className="text-[10px] text-emerald-400">{savedCount} guardados</span>}
                  </div>
                  <table className="w-full">
                    <thead><tr className="text-[10px] text-[#4a6080] font-semibold uppercase border-b border-white/[0.06]">
                      <th className="text-left py-1 pl-2">SKU</th><th className="text-left py-1">Nombre</th><th className="text-left py-1">Unidad</th><th className="text-left py-1">Categoría</th><th className="text-right py-1 pr-2">Precio</th>
                    </tr></thead>
                    <tbody className="text-xs">
                      {parsedProducts.map((p:any,i:number)=>(
                        <tr key={i} className="border-b border-white/[0.02] h-[28px]">
                          <td className="pl-2 font-mono text-[10px] text-[#4a6080]">{p.sku||"auto"}</td>
                          <td className="text-white">{p.name}</td>
                          <td className="text-[#7f93b0]">{p.unit||"PIEZA"}</td>
                          <td className="text-[#7f93b0]">{p.category||"—"}</td>
                          <td className="text-right pr-2 text-emerald-400">{p.price?`$${Number(p.price).toLocaleString("es-MX",{minimumFractionDigits:2})}`:"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-white/[0.08] flex-none">
              {parsedProducts.length===0?(
                <button onClick={handleUploadParse} disabled={parsing||!uploadFile||!uploadSuppId}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:bg-[#0f2448] text-white rounded-lg flex items-center gap-1.5">
                  {parsing?<><Loader2 className="w-3 h-3 animate-spin"/>Analizando...</>:<><Upload className="w-3 h-3"/>Analizar</>}
                </button>
              ):(
                <button onClick={saveParsedProducts} disabled={savingParsed}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#0f2448] text-white rounded-lg flex items-center gap-1.5">
                  {savingParsed?<><Loader2 className="w-3 h-3 animate-spin"/>Guardando {savedCount}/{parsedProducts.length}</>:<><Save className="w-3 h-3"/>Guardar {parsedProducts.length} productos</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
