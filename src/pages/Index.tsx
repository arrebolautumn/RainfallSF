import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { SeasonalAnalysis } from "@/components/dashboard/SeasonalAnalysis";
import { CorrelationAnalysis } from "@/components/dashboard/CorrelationAnalysis";
import { ExtremeEvents } from "@/components/dashboard/ExtremeEvents";
import { DataExport } from "@/components/dashboard/DataExport";
import { SfWeatherMap } from "@/components/dashboard/SfWeatherMap";
import {
  CloudRain,
  LayoutDashboard,
  Calendar,
  GitBranch,
  AlertTriangle,
  Download,
  Map,
} from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-rainfall">
              <CloudRain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Rainfall Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Historical Data Dashboard (1993-2023)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {}
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto gap-2 bg-muted/50 p-2">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>

            <TabsTrigger
              value="seasonal"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Seasonal</span>
            </TabsTrigger>

            <TabsTrigger
              value="correlation"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Correlation</span>
            </TabsTrigger>

            <TabsTrigger
              value="extreme"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Extreme Events</span>
            </TabsTrigger>

            {}
            <TabsTrigger
              value="export"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>

            {}
            <TabsTrigger
              value="sfmap"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">SF Map</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <DashboardOverview />
          </TabsContent>

          <TabsContent
            value="seasonal"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <SeasonalAnalysis />
          </TabsContent>

          <TabsContent
            value="correlation"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <CorrelationAnalysis />
          </TabsContent>

          <TabsContent
            value="extreme"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <ExtremeEvents />
          </TabsContent>

          {}
          <TabsContent
            value="export"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <DataExport />
          </TabsContent>

          {}
          <TabsContent
            value="sfmap"
            className="mt-6 animate-in fade-in-50 duration-300"
          >
            <SfWeatherMap />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
