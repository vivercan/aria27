import { supabase } from "@/lib/supabase";

export default async function AutorizarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: req } = await supabase
    .from("Requisiciones")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (!req) {
    return (
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head><body style={{margin:0}}>
      <div style={{fontFamily:"Outfit, sans-serif",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#0a0e1a"}}>
        <div style={{textAlign:"center",background:"#111827",border:"1px solid #1e293b",padding:60,borderRadius:12,maxWidth:420}}>
          <div style={{width:56,height:56,borderRadius:12,background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#ef4444",fontSize:24}}>&#x2715;</div>
          <h1 style={{color:"#e2e8f0",fontSize:20,fontWeight:700,margin:"0 0 6px"}}>Enlace Invalido</h1>
          <p style={{color:"#475569",fontSize:13,margin:0}}>Este enlace ya fue procesado o ha expirado.</p>
        </div>
      </div>
      </body></html>
    );
  }

  if (req.status !== "EN_AUTORIZACION") {
    return (
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head><body style={{margin:0}}>
      <div style={{fontFamily:"Outfit, sans-serif",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#0a0e1a"}}>
        <div style={{textAlign:"center",background:"#111827",border:"1px solid #1e293b",padding:60,borderRadius:12,maxWidth:420}}>
          <div style={{width:56,height:56,borderRadius:12,background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#f59e0b",fontSize:24}}>&#x26A0;</div>
          <h1 style={{color:"#e2e8f0",fontSize:20,fontWeight:700,margin:"0 0 6px"}}>Requisicion Procesada</h1>
          <p style={{color:"#475569",fontSize:13,margin:0}}>{req.folio} â Estado: <span style={{color:"#94a3b8"}}>{req.status}</span></p>
        </div>
      </div>
      </body></html>
    );
  }

  const cotData = req.cotizacion_data || {};
  const quotes: any[] = cotData.quotes || [];
  const items: string[] = cotData.items || [];
  const mejor = quotes.length > 0 ? quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]) : null;
  const solicitante = req.created_by || "N/A";

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .fi { animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
          .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.1s; } .d3 { animation-delay: 0.15s; } .d4 { animation-delay: 0.2s; } .d5 { animation-delay: 0.25s; }
          .row:hover { background: #111827 !important; }
          .btn { transition: all 0.2s ease; }
          .btn:hover { transform: translateY(-1px); }
          .ba:hover { background: #475569 !important; }
          .br:hover { background: rgba(239,68,68,0.15) !important; }
          @media (max-width: 640px) { .rt { font-size: 18px !important; } .tbl { min-width: 400px !important; } }
        `}</style>
      </head>
      <body>
        <div style={{fontFamily:"Outfit, sans-serif",minHeight:"100vh",background:"#0a0e1a",color:"#e2e8f0",padding:"24px 16px 48px"}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>

            {/* HEADER */}
            <div className="fi" style={{textAlign:"center",marginBottom:28}}>
              <span style={{color:"#475569",fontSize:10,fontWeight:600,letterSpacing:3}}>ARIA27</span>
              <h1 className="rt" style={{fontSize:22,fontWeight:700,margin:"6px 0 0",color:"#e2e8f0",letterSpacing:-0.3}}>Autorizacion de Compra</h1>
            </div>

            {/* INFO CARD */}
            <div className="fi d1" style={{background:"#111827",border:"1px solid #1e293b",borderRadius:10,padding:24,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:16}}>
                <div>
                  <p style={{color:"#475569",fontSize:9,fontWeight:600,letterSpacing:2,margin:"0 0 3px"}}>FOLIO</p>
                  <p style={{color:"#94a3b8",fontWeight:700,fontSize:18,margin:0}}>{req.folio}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{color:"#475569",fontSize:9,fontWeight:600,letterSpacing:2,margin:"0 0 3px"}}>OBRA</p>
                  <p style={{color:"#e2e8f0",fontWeight:600,fontSize:15,margin:0}}>{req.cost_center_name}</p>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
                <div>
                  <p style={{color:"#475569",fontSize:9,fontWeight:600,letterSpacing:2,margin:"0 0 3px"}}>SOLICITANTE</p>
                  <p style={{color:"#94a3b8",fontSize:13,fontWeight:500,margin:0}}>{solicitante}</p>
                </div>
                {req.urgency && req.urgency !== "normal" && (
                  <div style={{alignSelf:"center"}}>
                    <span style={{background:req.urgency==="critico"?"#dc2626":"#d97706",color:"white",padding:"4px 12px",borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:1}}>{req.urgency.toUpperCase()}</span>
                  </div>
                )}
              </div>
              {items.length > 0 && (
                <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #1e293b"}}>
                  <p style={{color:"#475569",fontSize:9,fontWeight:600,letterSpacing:2,margin:"0 0 6px"}}>MATERIALES</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {items.map((item: string, i: number) => (
                      <span key={i} style={{background:"#1e293b",color:"#94a3b8",padding:"4px 10px",borderRadius:4,fontSize:11,fontWeight:500}}>{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TABLE */}
            <div className="fi d2" style={{background:"#111827",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"14px 20px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{color:"#e2e8f0",fontSize:14,fontWeight:600,margin:0}}>Comparativa</p>
                  <p style={{color:"#475569",fontSize:11,margin:"2px 0 0"}}>{quotes.length} proveedores</p>
                </div>
                <span style={{background:"#1e293b",color:"#64748b",padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:600}}>{items.length} art.</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table className="tbl" style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                  <thead>
                    <tr>
                      <th style={{padding:"10px 16px",textAlign:"left",color:"#475569",fontSize:9,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid #1e293b"}}>PROVEEDOR</th>
                      <th style={{padding:"10px 16px",textAlign:"right",color:"#475569",fontSize:9,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid #1e293b"}}>TOTAL</th>
                      <th style={{padding:"10px 16px",textAlign:"center",color:"#475569",fontSize:9,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid #1e293b"}}>ENTREGA</th>
                      <th style={{padding:"10px 16px",textAlign:"center",color:"#475569",fontSize:9,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid #1e293b"}}>PAGO</th>
                      <th style={{padding:"10px 16px",textAlign:"center",color:"#475569",fontSize:9,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid #1e293b"}}>CREDITO</th>
                      <th style={{padding:"10px 16px",width:50,borderBottom:"1px solid #1e293b"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q: any, i: number) => {
                      const isBest = mejor && q.total === mejor.total;
                      return (
                        <tr key={i} className="row" style={{borderBottom:"1px solid #1e293b",background:isBest?"#0c1425":"transparent",transition:"background 0.15s"}}>
                          <td style={{padding:"12px 16px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:32,height:32,borderRadius:8,background:isBest?"#334155":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isBest?"#e2e8f0":"#475569",flexShrink:0}}>{q.supplier?.charAt(0) || "#"}</div>
                              <div>
                                <p style={{color:"#e2e8f0",fontSize:13,fontWeight:600,margin:0}}>{q.supplier}</p>
                                {q.factura && <p style={{color:"#475569",fontSize:9,margin:"1px 0 0"}}>Factura</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{padding:"12px 16px",textAlign:"right"}}>
                            <span style={{color:isBest?"#e2e8f0":"#94a3b8",fontWeight:isBest?700:500,fontSize:14}}>${typeof q.total === 'number' ? q.total.toLocaleString('es-MX') : q.total}</span>
                          </td>
                          <td style={{padding:"12px 16px",textAlign:"center",color:"#64748b",fontSize:12}}>{q.entrega || q.delivery || "-"}</td>
                          <td style={{padding:"12px 16px",textAlign:"center",color:"#64748b",fontSize:12}}>{q.forma_pago || q.payment || "-"}</td>
                          <td style={{padding:"12px 16px",textAlign:"center",color:"#64748b",fontSize:12}}>{q.credito || q.credit || "-"}</td>
                          <td style={{padding:"12px 16px",textAlign:"center"}}>{isBest && (<span style={{background:"#334155",color:"#94a3b8",padding:"2px 8px",borderRadius:3,fontSize:9,fontWeight:600,letterSpacing:1}}>MEJOR</span>)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BEST */}
            {mejor && (
              <div className="fi d3" style={{background:"#111827",border:"1px solid #1e293b",borderRadius:10,padding:18,textAlign:"center",marginBottom:20}}>
                <p style={{color:"#475569",fontSize:9,fontWeight:600,letterSpacing:2,margin:"0 0 4px"}}>MEJOR PRECIO</p>
                <p style={{color:"#e2e8f0",fontWeight:700,fontSize:18,margin:0}}>{mejor.supplier}</p>
                <p style={{color:"#94a3b8",fontWeight:700,fontSize:24,margin:"4px 0 0"}}>${typeof mejor.total === 'number' ? mejor.total.toLocaleString('es-MX') : mejor.total}</p>
              </div>
            )}

            {/* BUTTONS */}
            <div className="fi d4" style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <a href={`/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`} className="btn ba" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"14px 44px",background:"#334155",color:"#e2e8f0",textDecoration:"none",borderRadius:8,fontWeight:600,fontSize:14,letterSpacing:0.3,minWidth:180,border:"1px solid #475569"}}>
                AUTORIZAR
              </a>
              <a href={`/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`} className="btn br" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"14px 44px",background:"transparent",color:"#ef4444",textDecoration:"none",borderRadius:8,fontWeight:600,fontSize:14,letterSpacing:0.3,minWidth:180,border:"1px solid #1e293b"}}>
                RECHAZAR
              </a>
            </div>

            {/* FOOTER */}
            <div className="fi d5" style={{textAlign:"center",marginTop:32}}>
              <span style={{color:"#1e293b",fontSize:10,letterSpacing:2}}>ARIA27 Â· GRUPO CUAVANTE</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
