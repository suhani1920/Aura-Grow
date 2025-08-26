"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SensorMap } from "@/components/sensor-map"
import { SensorChart } from "@/components/sensor-chart"
import { NotificationSystem } from "@/components/notification-system"
import { AIRecommendations } from "@/components/ai-recommendations"
import { createClient } from "@/lib/supabase/client"
import { Droplets, Thermometer, Gauge, Zap, MapPin, Activity, Brain } from "lucide-react"

interface Sensor {
  id: string
  name: string
  type: string
  location_lat: number | null
  location_lng: number | null
  status: string
  latest_reading?: {
    value: number
    unit: string
    timestamp: string
  }
}

interface SensorReading {
  id: string
  sensor_id: string
  value: number
  unit: string
  timestamp: string
}

interface AIRecommendation {
  id: string
  recommendation_type: string
  message: string
  confidence_score: number
  status: string
  created_at: string
  sensor?: {
    name: string
  }
}

export function Dashboard() {
  const [isPumpActive, setIsPumpActive] = useState(false)
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSensors = async () => {
    try {
      const { data: sensorsData, error: sensorsError } = await supabase
        .from("sensors")
        .select(`
          *,
          sensor_readings (
            value,
            unit,
            timestamp
          )
        `)
        .order("created_at", { ascending: false })

      if (sensorsError) throw sensorsError

      // Process sensors with their latest readings
      const processedSensors =
        sensorsData?.map((sensor) => ({
          ...sensor,
          latest_reading: sensor.sensor_readings?.[0] || null,
          coordinates:
            sensor.location_lat && sensor.location_lng
              ? [sensor.location_lat, sensor.location_lng]
              : [29.375055, 79.531300], 
        })) || []

      setSensors(processedSensors)
    } catch (err) {
      console.error("Error fetching sensors:", err)
      setError("Failed to load sensor data")
    }
  }

  const fetchChartData = async () => {
    try {
      const { data, error } = await supabase
        .from("sensor_readings")
        .select(`
          value,
          unit,
          timestamp,
          sensors (type)
        `)
        .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("timestamp", { ascending: true })

      if (error) throw error

      // Process data for chart
      const processedData =
        data?.reduce((acc: any[], reading) => {
          const hour = new Date(reading.timestamp).getHours()
          const timeKey = `${hour.toString().padStart(2, "0")}:00`

          let existingEntry = acc.find((entry) => entry.time === timeKey)
          if (!existingEntry) {
            existingEntry = { time: timeKey }
            acc.push(existingEntry)
          }

          if (reading.sensors?.type === "soil_moisture") {
            existingEntry.moisture = reading.value
          } else if (reading.sensors?.type === "temperature") {
            existingEntry.temperature = reading.value
          }

          return acc
        }, []) || []

      setChartData(processedData)
    } catch (err) {
      console.error("Error fetching chart data:", err)
    }
  }

  const fetchAIRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_recommendations")
        .select(`
          *,
          sensors (name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setAIRecommendations(data || [])
    } catch (err) {
      console.error("Error fetching AI recommendations:", err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSensors(), fetchChartData(), fetchAIRecommendations()])
      setLoading(false)
    }

    loadData()

    // Set up real-time subscriptions
    const sensorsSubscription = supabase
      .channel("sensors_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, fetchSensors)
      .on("postgres_changes", { event: "*", schema: "public", table: "sensor_readings" }, () => {
        fetchSensors()
        fetchChartData()
      })
      .subscribe()

    const aiSubscription = supabase
      .channel("ai_recommendations_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_recommendations" }, fetchAIRecommendations)
      .subscribe()

    return () => {
      sensorsSubscription.unsubscribe()
      aiSubscription.unsubscribe()
    }
  }, [])

  const avgSoilMoisture =
    sensors
      .filter((s) => s.type === "soil_moisture" && s.latest_reading)
      .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter((s) => s.type === "soil_moisture" && s.latest_reading).length, 1)

  const avgTemperature =
    sensors
      .filter((s) => s.type === "temperature" && s.latest_reading)
      .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter((s) => s.type === "temperature" && s.latest_reading).length, 1)

  const waterTankLevel =
    sensors.find((s) => s.name.toLowerCase().includes("tank") && s.latest_reading)?.latest_reading?.value || 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "low":
        return "destructive"
      case "high":
        return "secondary"
      default:
        return "default"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "soil_moisture":
        return <Droplets className="h-4 w-4" />
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "water_level":
        return <Gauge className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aura_Grow Dashboard</h1>
            <p className="text-muted-foreground">Smart Agriculture Monitoring System</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem sensors={sensors} />
            <Badge variant="outline" className="text-sm">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Soil Moisture</CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSoilMoisture.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Real-time average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTemperature.toFixed(1)}°C</div>
              <p className="text-xs text-muted-foreground">Real-time average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Water Tank</CardTitle>
              <Gauge className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{waterTankLevel.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Current level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pump Status</CardTitle>
              <Zap className={`h-4 w-4 ${isPumpActive ? "text-green-500" : "text-gray-400"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isPumpActive ? "ON" : "OFF"}</div>
              <Button
                size="sm"
                variant={isPumpActive ? "destructive" : "default"}
                onClick={() => setIsPumpActive(!isPumpActive)}
                className="mt-2"
              >
                {isPumpActive ? "Turn OFF" : "Turn ON"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="map">Sensor Map</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Data</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Sensor Locations
                </CardTitle>
                <CardDescription>Real-time sensor locations and status across your farm</CardDescription>
              </CardHeader>
              <CardContent>
                <SensorMap sensors={sensors} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sensors.map((sensor) => (
                <Card key={sensor.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getIcon(sensor.type)}
                      {sensor.name}
                    </CardTitle>
                    <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sensor.latest_reading?.value?.toFixed(1) || "N/A"}
                      {sensor.latest_reading?.unit || ""}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lat: {sensor.location_lat?.toFixed(4)}, Lng: {sensor.location_lng?.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last reading:{" "}
                      {sensor.latest_reading?.timestamp
                        ? new Date(sensor.latest_reading.timestamp).toLocaleString()
                        : "No data"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sensor Trends</CardTitle>
                <CardDescription>24-hour sensor data trends</CardDescription>
              </CardHeader>
              <CardContent>
                <SensorChart data={chartData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>AI-powered recommendations and insights for your farm</CardDescription>
              </CardHeader>
              <CardContent>
                <AIRecommendations recommendations={aiRecommendations} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
