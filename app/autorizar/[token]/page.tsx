import { supabase } from "@/lib/supabase";

export default async function AutorizarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const { data: req } = await supabase
    .from("requisitions")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (!req) {
    return (
      <div style={{fontFamily:"Arial",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#0f172a"}}>
        <div style={{textAlign:"center",background:"#1e293b",padding:50,borderRadius:20,maxWidth:500}}>
          <div style={{fontSize:80}}>&#x274C;</div>
          <h1 style={{color:"#ef4444"}}>Token Invalido</h1>
          <p style={{color:"#94a3b8"}}>Este enlace ya fue procesado o expiro.</p>
        </div>
      </div>
    );
  }

  if (req.status !== "EN_AUTORIZACION") {
    return (
      <div style={{fontFamily:"Arial",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#0f172a"}}>
        <div style={{textAlign:"center",background:"#1e293b",padding:50,borderRadius:20,maxWidth:500}}>
          <div style={{fontSize:80}}>&#x26A0;&#xFE0F;</div>
          <h1 style={{color:"#f59e0b"}}>Ya Procesada</h1>
          <p style={{color:"#94a3b8"}}>{req.folio} tiene estado: {req.status}</p>
        </div>
      </div>
    );
  }

  const cotData = req.cotizacion_data || {};
  const quotes: any[] = cotData.quotes || [];
  const items: string[] = cotData.items || [];
  const mejor = quotes.length > 0 ? quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]) : null;

  return (
    <div style={{fontFamily:"Arial",minHeight:"100vh",background:"#0f172a",color:"white",padding:20}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <h1 style={{color:"#22d3ee",fontSize:28,margin:0}}>ARIA27</h1>
          <p style={{color:"#64748b",fontSize:12,letterSpacing:2}}>AUTORIZACION DE COMPRA</p>
        </div>

        <div style={{background:"#1e293b",borderRadius:12,padding:20,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div><p style={{color:"#64748b",fontSize:10,margin:0}}>FOLIO</p><p style={{color:"#22d3ee",fontWeight:"bold",fontSize:18,margin:0}}>{req.folio}</p></div>
            <div><p style={{color:"#64748b",fontSize:10,margin:0}}>OBRA</p><p style={{color:"white",fontWeight:"bold",margin:0}}>{req.cost_center_name}</p></div>
          </div>
          {items.length > 0 && (
            <div style={{marginTop:15,paddingTop:15,borderTop:"1px solid #334155"}}>
              <p style={{color:"#64748b",fontSize:10,margin:"0 0 5px"}}>MATERIALES</p>
              <p style={{color:"#94a3b8",fontSize:13,margin:0}}>{items.join(", ")}</p>
            </div>
          )}
        </div>

        <div style={{background:"#1e293b",borderRadius:12,overflow:"hidden",marginBottom:20}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#0f172a"}}>
                <th style={{padding:12,textAlign:"left",color:"#64748b",fontSize:11}}>Proveedor</th>
                <th style={{padding:12,textAlign:"right",color:"#64748b",fontSize:11}}>Total</th>
                <th style={{padding:12,textAlign:"center",color:"#64748b",fontSize:11,width:80}}>Mejor</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q: any, i: number) => (
                <tr key={i} style={{borderBottom:"1px solid #334155",background: mejor && q.total === mejor.total ? "#064e3b" : "transparent"}}>
                  <td style={{padding:12,color:"white",fontSize:14}}>{q.supplier}</td>
                  <td style={{padding:12,textAlign:"right",color: mejor && q.total === mejor.total ? "#34d399" : "white",fontWeight:"bold",fontSize:14}}>${q.total}</td>
                  <td style={{padding:12,textAlign:"center"}}>{mejor && q.total === mejor.total ? "***" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mejor && (
          <div style={{background:"#064e3b",border:"1px solid #10b981",borderRadius:12,padding:15,textAlign:"center",marginBottom:25}}>
            <p style={{color:"#34d399",margin:0,fontSize:13}}>MEJOR PRECIO</p>
            <p style={{color:"white",fontWeight:"bold",fontSize:20,margin:"5px 0 0"}}>{mejor.supplier} - ${mejor.total}</p>
          </div>
        )}

        <div style={{display:"flex",gap:15,justifyContent:"center",flexWrap:"wrap"}}>
          <a href={`/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`}
            style={{display:"inline-block",padding:"15px 50px",background:"#10b981",color:"white",textDecoration:"none",borderRadius:30,fontWeight:"bold",fontSize:16}}>
            AUTORIZAR COMPRA
          </a>
          <a href={`/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`}
            style={{display:"inline-block",padding:"15px 50px",background:"#ef4444",color:"white",textDecoration:"none",borderRadius:30,fontWeight:"bold",fontSize:16}}>
            RECHAZAR
          </a>
        </div>

        <p style={{textAlign:"center",color:"#475569",fontSize:11,marginTop:30}}>ARIA27 - Grupo Cuavante</p>
      </div>
    </div>
  );
}