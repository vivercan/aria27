import Link from "next/link"
import { HardHat, Users, ShoppingCart, PieChart, Truck, FileText, Settings } from "lucide-react"
import "./globals.css" // Importante importar el CSS limpio

const menu = [
  { name: "Build Desk", icon: HardHat, path: "/dashboard/build-desk" },
  { name: "Talent Hub", icon: Users, path: "/dashboard/talent-hub" },
  { name: "Supply Desk", icon: ShoppingCart, path: "/dashboard/supply-desk" },
  { name: "Finance", icon: PieChart, path: "/dashboard/finance" },
  { name: "Asset", icon: Truck, path: "/dashboard/asset" },
  { name: "Templates", icon: FileText, path: "/dashboard/templates" },
  { name: "Settings", icon: Settings, path: "/dashboard/settings" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-blue-500 selection:text-white"
            style={{ 
              background: 'radial-gradient(circle at top left, #0044AA, #001133)',
              backgroundAttachment: 'fixed' 
            }}
      >
        <div className="flex h-screen overflow-hidden bg-transparent">
          {/* Sidebar / Dock */}
          <aside className="w-64 flex flex-col m-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-20">
            <div className="p-8">
              <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                ARIA<span className="text-blue-500">27</span>
              </h2>
            </div>
            <nav className="flex-1 px-4 space-y-2">
              {menu.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className="flex items-center gap-4 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
                >
                  <item.icon className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-6">
              <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">ZO</div>
                <div className="text-xs">
                  <p className="text-white">Zoho Linked</p>
                  <p className="text-green-400">● Online</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 my-4 mr-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl z-10">
            <div className="h-full overflow-auto p-8 scrollbar-hide">
               {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
