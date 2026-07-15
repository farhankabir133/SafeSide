import { Request, Response } from "express";

const apiKey = process.env.OPENWEATHER_API_KEY;

export async function getWeather(req: Request, res: Response) {
  const { city } = req.params;
  if (!apiKey) {
    return res.status(422).json({ error: "NO_DATA_AVAILABLE", message: "Weather telemetry integration offline." });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`
    );
    if (!response.ok) {
      throw new Error("Weather service endpoint return error.");
    }
    const data: any = await response.json();
    res.json({
      temp: Math.round(data.main?.temp),
      feelsLike: Math.round(data.main?.feels_like),
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      humidity: data.main?.humidity,
      windSpeed: Math.round(data.wind?.speed * 3.6),
      windDirection: data.wind?.deg,
      visibility: data.visibility / 1000,
      conditions: data.weather?.[0]?.main,
      impact: data.weather?.[0]?.main === "Rain" || data.weather?.[0]?.main === "Snow" ? "MEDIUM" : "LOW",
    });
  } catch (err: any) {
    res.status(422).json({ error: "NO_DATA_AVAILABLE", message: err.message });
  }
}
