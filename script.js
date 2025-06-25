const loading = document.getElementById('loading');
const cityInput = document.getElementById("cityInput");
const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const localTime = document.getElementById("localTime");
const localDate = document.getElementById("localDate");
const thunder = document.getElementById("thunder");
const thunderLevel = document.getElementById("thunderLevel");

const weatherCodes = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Heavy showers", 82: "Violent rain", 95: "Thunderstorm", 96: "Thunderstorm with hail"
};

async function geocode(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`);
  const data = await res.json();
  return data.results ? data.results[0] : null;
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m,precipitation,snowfall,uv_index,visibility,weathercode&timezone=auto`;
  const res = await fetch(url);
  return await res.json();
}

function findClosestTimeIndex(times, currentTime) {
  const current = new Date(currentTime).getTime();
  let closest = 0, minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - current);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

async function updateWeatherByCoords(lat, lon, label = "Your Location") {
  loading.style.display = 'block';
  const weather = await fetchWeather(lat, lon);
  const cw = weather.current_weather;
  cityName.innerText = label;
  temperature.innerText = `${Math.round(cw.temperature)}°C`;
  description.innerText = weatherCodes[cw.weathercode] || "Unknown";
  wind.innerText = `${cw.windspeed} km/h`;

  const idx = findClosestTimeIndex(weather.hourly.time, cw.time);
  humidity.innerText = `${weather.hourly.relativehumidity_2m[idx] || "--"}%`;
  document.getElementById("rain").innerText = `${weather.hourly.precipitation[idx] || 0} mm`;
  document.getElementById("snow").innerText = `${weather.hourly.snowfall[idx] || 0} mm`;
  document.getElementById("fog").innerText = weather.hourly.visibility[idx] < 1000 ? "Yes" : "No";

  const uvIndex = weather.hourly.uv_index[idx];
  let sunlightLevel = "--";
  if (uvIndex >= 8) sunlightLevel = "Very High";
  else if (uvIndex >= 6) sunlightLevel = "High";
  else if (uvIndex >= 3) sunlightLevel = "Moderate";
  else if (uvIndex >= 0) sunlightLevel = "Low";
  document.getElementById("sunlight").innerText = sunlightLevel;

  const currentCode = cw.weathercode;
  const thunderCode = weather.hourly.weathercode[idx];
  const isThunder = (currentCode === 95 || currentCode === 96 || thunderCode === 95 || thunderCode === 96);
  thunder.innerText = isThunder ? "Yes" : "No";
  thunderLevel.innerText = currentCode === 96 || thunderCode === 96 ? "Very High" : currentCode === 95 || thunderCode === 95 ? "High" : "Low";

  document.body.classList.toggle('thunderstorm-active', isThunder);

  const now = new Date(cw.time);
  localTime.innerText = `Local Time: ${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  localDate.innerText = `Local Date: ${now.toLocaleDateString([], {day:'2-digit',month:'long',year:'numeric'})}`;
  loading.style.display = 'none';
}

cityInput.addEventListener("keyup", async e => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (!city) return;
    cityName.innerText = "Loading...";
    const loc = await geocode(city);
    cityName.innerText = loc ? loc.name : "City not found";
    if (loc) updateWeatherByCoords(loc.latitude, loc.longitude, loc.name);
  }
});

navigator.geolocation?.getCurrentPosition(
  pos => updateWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
  () => console.log("Location access denied.")
);
