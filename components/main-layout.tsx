"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense, use } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, Github, Menu, Monitor, Moon, Server, Sun, X, Palette, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { StatusIndicator } from "@/components/ui/status-indicator"
import type { Device } from "@/lib/supabase/types"
import { getDeviceStatus } from "@/utils/helpers"
import Link from "next/link"
import screens from "@/app/examples/screens.json"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"

// Loading fallbacks for different sections
const DeviceListFallback = () => (
  <div className="pl-6 space-y-2">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center w-full py-1">
        <div className="w-full flex items-center">
          <Skeleton className="h-5 w-[85%] rounded-md" />
          <Skeleton className="h-3 w-3 ml-2 rounded-full" />
        </div>
      </div>
    ))}
  </div>
)

const ExamplesListFallback = () => (
  <div className="pl-6 space-y-2">
    <div className="flex items-center w-full py-1">
      <Skeleton className="h-5 w-[70%] rounded-md" />
    </div>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center w-full py-1">
        <Skeleton className="h-5 w-[85%] rounded-md" />
      </div>
    ))}
  </div>
)

// Main navigation skeleton for the entire sidebar
const SidebarSkeletonFallback = () => (
  <div className="p-2 space-y-2">
    {/* Overview button */}
    <div className="w-full h-9 flex items-center">
      <Skeleton className="h-4 w-4 mr-2 rounded-md" />
      <Skeleton className="h-5 w-24 rounded-md" />
    </div>
    
    {/* Devices section */}
    <div className="w-full h-9 flex items-center justify-between">
      <div className="flex items-center">
        <Skeleton className="h-4 w-4 mr-2 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-4 rounded-md" />
    </div>
    
    {/* Examples section */}
    <div className="w-full h-9 flex items-center justify-between">
      <div className="flex items-center">
        <Skeleton className="h-4 w-4 mr-2 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-4 w-4 rounded-md" />
    </div>
    
    {/* System Log button */}
    <div className="w-full h-9 flex items-center">
      <Skeleton className="h-4 w-4 mr-2 rounded-md" />
      <Skeleton className="h-5 w-28 rounded-md" />
    </div>
    
    {/* Maintenance button */}
    <div className="w-full h-9 flex items-center">
      <Skeleton className="h-4 w-4 mr-2 rounded-md" />
      <Skeleton className="h-5 w-28 rounded-md" />
    </div>
  </div>
)

// Device list component to wrap in Suspense
const DeviceList = ({ devices, isActiveDevicePath }: { 
  devices: (Device & { status: string })[], 
  isActiveDevicePath: (id: string) => boolean 
}) => {
  return (
    <>
      {Array.isArray(devices) ? devices.map((device) => (
        <Button
          key={device.id}
          variant="ghost"
          size="sm"
          className={`w-full justify-start text-sm h-8 ${isActiveDevicePath(device.friendly_id) ? "bg-muted" : ""}`}
          asChild
        >
          <Link href={`/device/${device.friendly_id}`}>
            <div className="flex items-center w-full">
              <span className="truncate text-xs">{device.name}</span>
              <StatusIndicator 
                status={device.status as "online" | "offline"} 
                size="sm" 
                className="ml-1" 
              />
            </div>
          </Link>
        </Button>
      )) : (
        <div className="pl-6 space-y-2">
         No devices found
        </div>
      )}
    </>
  )
}

// Examples list component to wrap in Suspense
const ExamplesList = ({ 
  components, 
  isActiveExamplesPath, 
  isActivePath 
}: { 
  components: [string, typeof screens[keyof typeof screens]][], 
  isActiveExamplesPath: (slug: string) => boolean,
  isActivePath: (path: string) => boolean
}) => {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start text-sm h-8 ${isActivePath("/examples") ? "bg-muted" : ""}`}
        asChild
      >
        <Link href="/examples">
          <span className="truncate text-xs">All Components</span>
        </Link>
      </Button>
      
      {components.map(([slug, config]) => (
        <Button
          key={slug}
          variant="ghost"
          size="sm"
          className={`w-full justify-start text-sm h-8 ${isActiveExamplesPath(slug) ? "bg-muted" : ""}`}
          asChild
        >
          <Link href={`/examples/${slug}`}>
            <span className="truncate text-xs">{config.title}</span>
          </Link>
        </Button>
      ))}
    </>
  )
}

interface MainLayoutProps {
  children: React.ReactNode
  devicesPromise: Promise<Device[]>
}

export default function MainLayout({ children, devicesPromise }: MainLayoutProps) {
  const devices = use(devicesPromise)
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDevicesOpen, setIsDevicesOpen] = useState(true)
  const [isExamplesOpen, setIsExamplesOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  // Determine if a path is active
  const isActivePath = (path: string) => pathname === path
  const isActiveDevicePath = (friendly_id: string) => pathname === `/device/${friendly_id}`
  const isActiveExamplesPath = (slug: string) => pathname === `/examples/${slug}`
  const isExamplesPath = pathname === '/examples' || pathname.startsWith('/examples/')

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        mainRef.current &&
        mainRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSidebarOpen])

  // Open devices section if a device page is active
  useEffect(() => {
    if (pathname.startsWith("/device/")) {
      setIsDevicesOpen(true)
    }
    
    // Open examples section if a examples page is active
    if (pathname.startsWith("/examples/")) {
      setIsExamplesOpen(true);
    }
  }, [pathname])

  // Add status and type to devices
  const enhancedDevices = devices.map((device) => ({
    ...device,
    status: getDeviceStatus(device),
  }))

  // Get examples components
  const examplesComponents = Object.entries(screens)
    .filter(([, config]) => process.env.NODE_ENV !== "production" || config.published)
    .sort((a, b) => a[1].title.localeCompare(b[1].title));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">byos-nextjs for <Link href="https://usetrmnl.com" target="_blank" rel="noopener noreferrer">TRMNL</Link></h1>
            <span className="text-red-500 font-mono font-bold text-xs -ml-2 -mt-4 align-text-top">alpha</span>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="size-5 dark:hidden" /> <Moon className="size-5 hidden dark:block" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="https://github.com/ghcpuman902/byos-nextjs" target="_blank" rel="noopener noreferrer">
                <Github className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside
          ref={sidebarRef}
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 z-50 flex w-56 flex-col border-r bg-background transition-transform md:translate-x-0 md:relative`}
        >
          <div className="md:hidden flex justify-end p-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <X className="size-5" />
            </Button>
          </div>
          <div className="flex-1">
            <Suspense fallback={<SidebarSkeletonFallback />}>
              <nav className="p-2 space-y-1">
                <Button
                  variant="ghost"
                className={`w-full justify-start text-sm h-9 ${isActivePath("/") ? "bg-muted" : ""}`}
                asChild
              >
                <Link href="/">
                  <Server className="mr-2 h-4 w-4" />
                  Overview
                </Link>
              </Button>

              <Collapsible open={isDevicesOpen} onOpenChange={setIsDevicesOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm h-9">
                    <div className="flex items-center">
                      <Monitor className="mr-2 h-4 w-4" />
                      Devices
                    </div>
                    {isDevicesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  <Suspense fallback={<DeviceListFallback />}>
                    <DeviceList 
                      devices={enhancedDevices} 
                      isActiveDevicePath={isActiveDevicePath} 
                    />
                  </Suspense>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={isExamplesOpen} onOpenChange={setIsExamplesOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-between text-sm h-9 ${isExamplesPath ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center">
                      <Palette className="mr-2 h-4 w-4" />
                      Examples
                    </div>
                    {isExamplesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  <Suspense fallback={<ExamplesListFallback />}>
                    <ExamplesList 
                      components={examplesComponents} 
                      isActiveExamplesPath={isActiveExamplesPath}
                      isActivePath={isActivePath}
                    />
                  </Suspense>
                </CollapsibleContent>
              </Collapsible>

              <Button
                variant="ghost"
                className={`w-full justify-start text-sm h-9 ${isActivePath("/system-logs") ? "bg-muted" : ""}`}
                asChild
              >
                <Link href="/system-logs">
                  <Server className="mr-2 h-4 w-4" />
                  System Log
                </Link>
                </Button>

                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm h-9 ${isActivePath("/maintenance") ? "bg-muted" : ""}`}
                  asChild
                >
                  <Link href="/maintenance">  
                    <Wrench className="mr-2 h-4 w-4" />
                    Maintenance
                  </Link>
                </Button>
              </nav>
            </Suspense>
          </div>
        </aside>
        <main ref={mainRef} className="flex-1">
            {children}
        </main>
      </div>
      <footer className="border-t bg-background py-3 px-4 text-sm text-muted-foreground">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">byos-nextjs</span>
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-md">α</span>
          </div>
          <div className="text-xs">
            <span>Found an issue? </span>
            <Link 
              href="https://github.com/ghcpuman902/byos-nextjs/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Open a GitHub issue
            </Link>
            <span> or email with screenshots</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

