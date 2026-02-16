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
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head><body style={{margin:0}}>
      <div style={{fontFamily:"Outfit, sans-serif",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a1628 100%)"}}>
        <div style={{textAlign:"center",background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)",padding:60,borderRadius:24,maxWidth:450}}>
          <div style={{width:80,height:80,borderRadius:20,background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36}}>&#x274C;</div>
          <h1 style={{color:"#ef4444",fontSize:24,fontWeight:700,margin:"0 0 8px"}}>Enlace Invalido</h1>
          <p style={{color:"#64748b",fontSize:14,margin:0,lineHeight:1.6}}>Este enlace ya fue procesado o ha expirado.</p>
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
      <div style={{fontFamily:"Outfit, sans-serif",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a1628 100%)"}}>
        <div style={{textAlign:"center",background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.06)",padding:60,borderRadius:24,maxWidth:450}}>
          <div style={{width:80,height:80,borderRadius:20,background:"rgba(245,158,11,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36}}>&#x26A0;&#xFE0F;</div>
          <h1 style={{color:"#f59e0b",fontSize:24,fontWeight:700,margin:"0 0 8px"}}>Requisicion Procesada</h1>
          <p style={{color:"#64748b",fontSize:14,margin:0,lineHeight:1.6}}>{req.folio} - Estado: <span style={{color:"#94a3b8",fontWeight:600}}>{req.status}</span></p>
        </div>
      </div>
      </body></html>
    );
  }

  const cotData = req.cotizacion_data || {};
  const quotes: any[] = cotData.quotes || [];
  const items: string[] = cotData.items || [];
  const mejor = quotes.length > 0 ? quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]) : null;

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          .fade-up { animation: fadeUp 0.6s ease-out forwards; opacity: 0; }
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
          .delay-4 { animation-delay: 0.4s; }
          .delay-5 { animation-delay: 0.5s; }
          .btn-auth { transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden; }
          .btn-auth:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16,185,129,0.3); }
          .btn-reject:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(239,68,68,0.3); }
          .supplier-row { transition: all 0.2s ease; }
          .supplier-row:hover { background: rgba(255,255,255,0.04) !important; }
          .best-badge { background: linear-gradient(135deg, #10b981, #059669); animation: pulse 2s ease-in-out infinite; }
          .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
          .accent-line { background: linear-gradient(90deg, #22d3ee, #10b981, #22d3ee); background-size: 200% auto; animation: shimmer 3s linear infinite; }
          @media (max-width: 640px) { .responsive-text { font-size: 20px !important; } }
        `}</style>
      </head>
      <body>
        <div style={{fontFamily:"Outfit, sans-serif",minHeight:"100vh",background:"linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a1628 100%)",color:"white",padding:"20px 16px 40px"}}>
          <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:600,height:600,background:"radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)",pointerEvents:"none",zIndex:0}} />
          
          <div style={{maxWidth:800,margin:"0 auto",position:"relative",zIndex:1}}>
            
            <div className="fade-up" style={{textAlign:"center",marginBottom:32}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:32,height:3,borderRadius:2,background:"#22d3ee"}} />
                <span style={{color:"#22d3ee",fontSize:11,fontWeight:600,letterSpacing:3}}>ARIA27</span>
                <div style={{width:32,height:3,borderRadius:2,background:"#22d3ee"}} />
              </div>
              <h1 className="responsive-text" style={{fontSize:28,fontWeight:800,margin:"4px 0",background:"linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Autorizacion de Compra
              </h1>
            </div>

            <div className="fade-up delay-1 glass-card" style={{borderRadius:16,padding:24,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
                <div>
                  <p style={{color:"#475569",fontSize:10,fontWeight:600,letterSpacing:2,margin:"0 0 4px"}}>FOLIO</p>
                  <p style={{color:"#22d3ee",fontWeight:800,fontSize:22,margin:0}}>{req.folio}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{color:"#475569",fontSize:10,fontWeight:600,letterSpacing:2,margin:"0 0 4px"}}>OBRA</p>
                  <p style={{color:"white",fontWeight:700,fontSize:18,margin:0}}>{req.cost_center_name}</p>
                </div>
              </div>
              {items.length > 0 && (
                <>
                  <div className="accent-line" style={{height:1,margin:"16px 0",borderRadius:1}} />
                  <p style={{color:"#475569",fontSize:10,fontWeight:600,letterSpacing:2,margin:"0 0 8px"}}>MATERIALES SOLICITADOS</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {items.map((item: string, i: number) => (
                      <span key={i} style={{background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.15)",color:"#22d3ee",padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500}}>{item}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {req.urgency && req.urgency !== "normal" && (
              <div className="fade-up delay-1" style={{display:"inline-flex",alignItems:"center",gap:6,background:req.urgency==="critico"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)",border:`1px solid ${req.urgency==="critico"?"rgba(239,68,68,0.2)":"rgba(245,158,11,0.2)"}`,padding:"6px 14px",borderRadius:20,marginBottom:16,color:req.urgency==="critico"?"#ef4444":"#f59e0b",fontSize:11,fontWeight:600,letterSpacing:1}}>
                {req.urgency.toUpperCase()}
              </div>
            )}

            <div className="fade-up delay-2 glass-card" style={{borderRadius:16,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <p style={{color:"white",fontSize:15,fontWeight:700,margin:0}}>Comparativa de Cotizaciones</p>
                    <p style={{color:"#475569",fontSize:12,margin:"2px 0 0"}}>{quotes.length} proveedores cotizados</p>
                  </div>
                  <div style={{background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.2)",padding:"4px 12px",borderRadius:12,color:"#22d3ee",fontSize:11,fontWeight:600}}>{items.length} articulo{items.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                  <thead>
                    <tr>
                      <th style={{padding:"12px 16px",textAlign:"left",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>PROVEEDOR</th>
                      <th style={{padding:"12px 16px",textAlign:"right",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>TOTAL</th>
                      <th style={{padding:"12px 16px",textAlign:"center",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>ENTREGA</th>
                      <th style={{padding:"12px 16px",textAlign:"center",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>PAGO</th>
                      <th style={{padding:"12px 16px",textAlign:"center",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>CREDITO</th>
                      <th style={{padding:"12px 16px",textAlign:"center",color:"#475569",fontSize:10,fontWeight:600,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)",width:60}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q: any, i: number) => {
                      const isBest = mejor && q.total === mejor.total;
                      return (
                        <tr key={i} className="supplier-row" style={{borderBottom:"1px solid rgba(255,255,255,0.04)",background:isBest?"rgba(16,185,129,0.06)":"transparent"}}>
                          <td style={{padding:"14px 16px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:36,height:36,borderRadius:10,background:isBest?"linear-gradient(135deg, #10b981, #059669)":"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:isBest?"white":"#64748b",flexShrink:0}}>{q.supplier?.charAt(0) || "#"}</div>
                              <div>
                                <p style={{color:"white",fontSize:14,fontWeight:600,margin:0}}>{q.supplier}</p>
                                {q.factura && <p style={{color:"#475569",fontSize:10,margin:"2px 0 0"}}>Con factura</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{padding:"14px 16px",textAlign:"right"}}>
                            <span style={{color:isBest?"#34d399":"white",fontWeight:700,fontSize:16}}>${typeof q.total === 'number' ? q.total.toLocaleString('es-MX') : q.total}</span>
                          </td>
                          <td style={{padding:"14px 16px",textAlign:"center",color:"#94a3b8",fontSize:13}}>{q.entrega || q.delivery || "-"}</td>
                          <td style={{padding:"14px 16px",textAlign:"center",color:"#94a3b8",fontSize:13}}>{q.forma_pago || q.payment || "-"}</td>
                          <td style={{padding:"14px 16px",textAlign:"center",color:"#94a3b8",fontSize:13}}>{q.credito || q.credit || "-"}</td>
                          <td style={{padding:"14px 16px",textAlign:"center"}}>{isBest && (<span className="best-badge" style={{display:"inline-block",padding:"3px 10px",borderRadius:12,color:"white",fontSize:9,fontWeight:700,letterSpacing:1}}>MEJOR</span>)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {mejor && (
              <div className="fade-up delay-3" style={{background:"linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:16,padding:20,textAlign:"center",marginBottom:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",pointerEvents:"none"}} />
                <p style={{color:"#34d399",fontSize:10,fontWeight:600,letterSpacing:2,margin:"0 0 6px",position:"relative"}}>MEJOR PRECIO</p>
                <p style={{color:"white",fontWeight:800,fontSize:22,margin:0,position:"relative"}}>{mejor.supplier}</p>
                <p style={{color:"#34d399",fontWeight:700,fontSize:28,margin:"4px 0 0",position:"relative"}}>${typeof mejor.total === 'number' ? mejor.total.toLocaleString('es-MX') : mejor.total}</p>
              </div>
            )}

            <div className="fade-up delay-4" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
              <a href={`/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`} className="btn-auth" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"16px 48px",background:"linear-gradient(135deg, #10b981, #059669)",color:"white",textDecoration:"none",borderRadius:14,fontWeight:700,fontSize:15,letterSpacing:0.5,border:"1px solid rgba(255,255,255,0.1)",minWidth:200}}>
                AUTORIZAR COMPRA
              </a>
              <a href={`/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`} className="btn-auth btn-reject" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"16px 48px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",textDecoration:"none",borderRadius:14,fontWeight:700,fontSize:15,letterSpacing:0.5,minWidth:200}}>
                RECHAZAR
              </a>
            </div>

            <div className="fade-up delay-5" style={{textAlign:"center",marginTop:32}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <div style={{width:20,height:2,background:"#1e293b",borderRadius:1}} />
                <span style={{color:"#334155",fontSize:10,fontWeight:500,letterSpacing:2}}>ARIA27 - GRUPO CUAVANTE</span>
                <div style={{width:20,height:2,background:"#1e293b",borderRadius:1}} />
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
