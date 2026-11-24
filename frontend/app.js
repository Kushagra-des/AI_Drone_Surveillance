const get = (id) => document.getElementById(id);
const feed = get("video-feed"), message = get("video-message");
const status = get("connection-status"), dot = get("status-dot");
const body = get("events-body"), counts = get("counts");
const sourceType = get("source-type"), source = get("source");
const startButton = get("start-button"), stopButton = get("stop-button");
const monitoringState = get("monitoring-state");
const objectFilter = get("object-filter"), alertFilter = get("alert-filter");
const alertTypeFilter = get("alert-type-filter");
const exportButton = get("export-button");
const snapshotButton = get("snapshot-button");
const zoneAlertButton = get("zone-alert-button"), loiterAlertButton = get("loiter-alert-button");
let feedReady = false;
let monitoring = false;
let loadingEvents = false;
let renderedEvents = "";
let events = [];
let alertSettings = { zone_alerts: true, loitering_alerts: true };

function setConnection(online) {
  status.textContent = online ? "Connected" : "Offline";
  dot.classList.toggle("online", online);
}
feed.addEventListener("load", () => {
  feedReady = true; snapshotButton.disabled = !monitoring; feed.classList.add("ready"); message.hidden = true; setConnection(true);
});
feed.addEventListener("error", () => {
  feedReady = false; snapshotButton.disabled = true; feed.classList.remove("ready"); message.hidden = false; setConnection(false);
});

function addCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
}
async function loadEvents() {
  if (loadingEvents) return;
  loadingEvents = true;
  try {
    const response = await fetch("/api/events", { cache: "no-store" });
    if (!response.ok) throw new Error();
    events = await response.json();
    if (!Array.isArray(events)) throw new Error();
    updateObjectFilter(); renderEvents();
    counts.textContent = `Objects: ${events.filter((event) => !event.event_type).length} · Alerts: ${events.filter((event) => event.alert).length}`;
    setConnection(true);
  } catch { if (!feedReady) setConnection(false); }
  finally { loadingEvents = false; }
}
function updateObjectFilter() {
  const selected = objectFilter.value;
  objectFilter.replaceChildren(new Option("All", "all"));
  [...new Set(events.map((event) => event.type).filter(Boolean))].sort().forEach((type) => objectFilter.add(new Option(type, type)));
  if ([...objectFilter.options].some((option) => option.value === selected)) objectFilter.value = selected;
}
function visibleEvents() {
  return events.filter((event) => (objectFilter.value === "all" || event.type === objectFilter.value)
    && (alertFilter.value === "all" || event.alert)
    && (alertTypeFilter.value === "all" || event.event_type === alertTypeFilter.value));
}
function renderEvents() {
  const visible = visibleEvents();
  const signature = JSON.stringify(visible);
  if (signature === renderedEvents) return;
  renderedEvents = signature;
  body.replaceChildren();
  visible.forEach((event) => {
      const row = document.createElement("tr");
      addCell(row, event.time ?? "", "time"); addCell(row, event.type ?? "");
      addCell(row, event.id ?? "", "numeric");
      const confidence = Number(event.confidence);
      addCell(row, Number.isFinite(confidence) ? `${(confidence * 100).toFixed(0)}%` : "", "numeric");
      const label = document.createElement("td");
      if (event.alert) {
        const alert = document.createElement("span"); alert.className = "alert-label"; alert.textContent = "ALERT"; label.append(alert);
        if (event.event_type) {
          const type = document.createElement("span"); type.className = "alert-type"; type.textContent = ` ${event.event_type}`; label.append(type);
        }
      }
      row.append(label); body.append(row);
  });
}
objectFilter.addEventListener("change", renderEvents);
alertFilter.addEventListener("change", renderEvents);
alertTypeFilter.addEventListener("change", renderEvents);
exportButton.addEventListener("click", () => {
  const rows = [["Time", "Object", "ID", "Confidence", "Alert"], ...visibleEvents().map((event) =>
    [event.time, event.type, event.id, event.confidence, event.alert ? "ALERT" : ""] )];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a"), url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.href = url; link.download = "drone-events.csv"; link.click(); URL.revokeObjectURL(url);
});
snapshotButton.addEventListener("click", () => {
  if (!feedReady || !feed.naturalWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = feed.naturalWidth; canvas.height = feed.naturalHeight;
  canvas.getContext("2d").drawImage(feed, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a"), url = URL.createObjectURL(blob);
    link.href = url; link.download = `drone-snapshot-${Date.now()}.jpg`; link.click(); URL.revokeObjectURL(url);
  }, "image/jpeg");
});
function renderAlertButtons() {
  zoneAlertButton.textContent = `Zone alerts: ${alertSettings.zone_alerts ? "On" : "Off"}`;
  loiterAlertButton.textContent = `Loitering alerts: ${alertSettings.loitering_alerts ? "On" : "Off"}`;
  zoneAlertButton.setAttribute("aria-pressed", alertSettings.zone_alerts);
  loiterAlertButton.setAttribute("aria-pressed", alertSettings.loitering_alerts);
}
async function updateAlertSettings(key) {
  const next = { ...alertSettings, [key]: !alertSettings[key] };
  zoneAlertButton.disabled = true; loiterAlertButton.disabled = true;
  try {
    const response = await fetch("/api/monitor/alert-settings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
    });
    if (!response.ok) throw new Error("Could not update alert settings");
    alertSettings = await response.json(); renderAlertButtons();
  } catch (error) { monitoringState.textContent = error.message; }
  finally { zoneAlertButton.disabled = false; loiterAlertButton.disabled = false; }
}
zoneAlertButton.addEventListener("click", () => updateAlertSettings("zone_alerts"));
loiterAlertButton.addEventListener("click", () => updateAlertSettings("loitering_alerts"));
async function loadAlertSettings() {
  try {
    const response = await fetch("/api/monitor/alert-settings", { cache: "no-store" });
    if (response.ok) { alertSettings = await response.json(); renderAlertButtons(); }
  } catch {}
}
function setMonitoring(active) {
  monitoring = active;
  monitoringState.textContent = active ? "Monitoring" : "Not monitoring";
  startButton.disabled = active; stopButton.disabled = !active; stopButton.textContent = "Stop";
  snapshotButton.disabled = !active || !feedReady;
  sourceType.disabled = active; source.disabled = active;
}
async function sendMonitorRequest(path, data) {
  const options = { method: "POST" };
  if (data) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  const result = response.headers.get("content-type")?.includes("application/json")
    ? await response.json() : {};
  if (!response.ok) throw new Error(result.detail || `Request failed (${response.status})`);
  return result;
}
startButton.addEventListener("click", async () => {
  monitoringState.textContent = "Starting…"; startButton.disabled = true;
  try {
    await sendMonitorRequest("/api/monitor/start", { source_type: sourceType.value, source: source.value.trim() });
    setMonitoring(true); feed.src = `/video_feed?t=${Date.now()}`;
  } catch (error) { monitoringState.textContent = error.message; startButton.disabled = false; }
});
stopButton.addEventListener("click", async () => {
  stopButton.disabled = true; stopButton.textContent = "Stopping…"; monitoringState.textContent = "Stopping…";
  try {
    await sendMonitorRequest("/api/monitor/stop");
    setMonitoring(false); feed.src = `/video_feed?t=${Date.now()}`;
  } catch (error) {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && !data.active_session) {
        setMonitoring(false); feed.src = `/video_feed?t=${Date.now()}`; return;
      }
    } catch {}
    monitoringState.textContent = error.message; stopButton.disabled = false; stopButton.textContent = "Stop";
  }
});
sourceType.addEventListener("change", () => {
  source.value = sourceType.value === "webcam" ? "0" : "";
  source.placeholder = sourceType.value === "webcam" ? "Camera index" : "Uploaded video filename";
});
async function loadMonitoringStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const data = await response.json();
    if (response.ok && data.active_session) {
      setMonitoring(true); sourceType.value = data.active_session.source_type; source.value = data.active_session.source_id;
      feed.src = `/video_feed?t=${Date.now()}`;
    }
  } catch {}
}
loadEvents(); loadMonitoringStatus(); loadAlertSettings(); setInterval(loadEvents, 2000);
