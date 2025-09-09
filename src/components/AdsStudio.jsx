import { useState } from "react";

/* ----------------- Defaults ----------------- */
const defaultPersona = {
  name: "General 25-45",
  age_min: 25,
  age_max: 45,
  genders: ["unknown"],
  pains: ["no tiene celular actualizado"],
  goals: ["mejorar rendimiento"],
  interests: ["Tecnología", "Apple", "iOS"],
  keywords: ["iphone 14", "comprar iphone", "iphone 14 precio"],
};

const DEFAULT_FORM = {
  product_name: "iPhone 14 128GB",
  value_prop: "Garantía oficial y envío en 24hs",
  website: "https://libertyclub.io/",
  landing_path: "/iphone-14",
  location_countries: ["AR"],
  location_cities: ["Buenos Aires"],
  language: "es",
  budget_daily: 50,
  objective: "conversions",
  platform: ["google", "meta"],
  personas: [defaultPersona],
  promo: "12x sin interés y envío gratis",
  // Nuevo: imagen
  image_url: "",        // opción 1: pegar URL
  image_base64: "",     // opción 2: subir archivo (se llena automáticamente)
};

function dedupe(a = []) {
  return Array.from(new Set((a || []).filter(Boolean)));
}

function normalizeUrl(u = "") {
  try {
    // acepta ya absolutas
    const url = new URL(u);
    return url.href;
  } catch {
    // intenta agregar https
    if (!u) return "";
    return `https://${u.replace(/^https?:\/\//, "")}`;
  }
}

function cleanPayload(form) {
  // limpia y normaliza lo que enviamos
  const website = normalizeUrl(form.website);
  const location_countries = dedupe(form.location_countries);
  const location_cities = dedupe(form.location_cities);
  const platform = dedupe(form.platform);

  // limpia personas (sin tags vacíos)
  const personas = (form.personas || []).map((p) => ({
    ...p,
    interests: dedupe(p.interests),
    keywords: dedupe(p.keywords),
  }));

  const out = {
    ...form,
    website,
    location_countries,
    location_cities,
    platform,
    personas,
  };

  // Si hay base64, priorizarlo sobre image_url
  if (form.image_base64) {
    out.image_base64 = form.image_base64;
  } else {
    delete out.image_base64;
  }

  if (!form.image_url) delete out.image_url;

  return out;
}

export default function AdsStudio() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  // Evita dobles barras y facilita override por Vite
  const rawBase = import.meta.env.VITE_API_BASE || "https://crm-ia-eight.vercel.app";
  const apiBase = rawBase.replace(/\/+$/, "");

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResp(null);

    try {
      // Validaciones rápidas
      if (!form.product_name?.trim()) throw new Error("Falta el nombre de producto.");
      if (!form.platform?.length) throw new Error("Seleccioná al menos una plataforma.");
      if (!form.personas?.length) throw new Error("Agregá al menos un segmento/persona.");
      if (form.budget_daily === "" || !(globalThis.Number(form.budget_daily) > 0)) {
        throw new Error("El presupuesto diario debe ser mayor a 0.");
      }

      const payload = cleanPayload(form);

      const r = await fetch(`${apiBase}/ads/segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // si tu endpoint no usa cookies/sesión, no agregues credentials
      });

      let data;
      const text = await r.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { detail: text || "Respuesta no-JSON del servidor" };
      }

      if (!r.ok) {
        const detail = data?.detail || r.statusText || "Error en el endpoint";
        throw new Error(`${r.status} ${detail}`);
      }

      setResp(data);
    } catch (e) {
      setError(e.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addPersona = () =>
    update("personas", [
      ...form.personas,
      { ...defaultPersona, name: `Segmento ${form.personas.length + 1}` },
    ]);

  const rmPersona = (i) =>
    update(
      "personas",
      form.personas.filter((_, idx) => idx !== i)
    );

  const downloadPlan = () => {
    if (!resp?.plan) return;
    const blob = new Blob([JSON.stringify(resp.plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "plan.json";
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nexentrix · Segmentación y Previews</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(DEFAULT_FORM)}
              className="px-3 py-1 rounded-lg text-sm border"
            >
              Restablecer defaults
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Generando..." : "Generar recomendaciones"}
            </button>
          </div>
        </header>

        {/* Formulario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Text
                label="Producto"
                value={form.product_name}
                onChange={(v) => update("product_name", v)}
              />
              <Text
                label="Propuesta de valor"
                value={form.value_prop}
                onChange={(v) => update("value_prop", v)}
              />
              <Text
                label="Sitio"
                value={form.website}
                onChange={(v) => update("website", v)}
                onBlur={() => update("website", normalizeUrl(form.website))}
              />
              <Text
                label="Landing"
                value={form.landing_path}
                onChange={(v) => update("landing_path", v)}
              />
              <Text
                label="Países (coma)"
                value={(Array.isArray(form.location_countries)
                  ? form.location_countries
                  : []
                ).join(", ")}
                onChange={(v) =>
                  update(
                    "location_countries",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
              <Text
                label="Ciudades (coma)"
                value={(Array.isArray(form.location_cities)
                  ? form.location_cities
                  : []
                ).join(", ")}
                onChange={(v) =>
                  update(
                    "location_cities",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
              <Select
                label="Objetivo"
                value={form.objective}
                onChange={(v) => update("objective", v)}
                options={["conversions", "leadgen", "traffic", "reach", "awareness"]}
              />
              <NumberInput
                label="Presupuesto diario (USD)"
                value={form.budget_daily}
                onChange={(v) =>
                  update("budget_daily", v === "" ? "" : globalThis.Number(v) || 0)
                }
              />
              <Multi
                label="Plataformas"
                value={form.platform}
                onChange={(arr) => update("platform", dedupe(arr))}
                options={["google", "meta"]}
              />
              <Text
                label="Promo"
                value={form.promo || ""}
                onChange={(v) => update("promo", v)}
              />
            </div>

            {/* Imagen (URL o Archivo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImagePicker
                label="Imagen del anuncio (subir archivo)"
                value={form.image_url}
                onUrlChange={(u) => update("image_url", u)}
                onBase64={(b64, previewUrl) => {
                  update("image_base64", b64);
                  update("image_url", previewUrl || "");
                }}
                onClear={() => {
                  update("image_url", "");
                  update("image_base64", "");
                }}
              />
              <Text
                label="Imagen del anuncio (URL)"
                value={form.image_url}
                onChange={(v) => {
                  update("image_url", v);
                  // si el user pega una URL manual, descartamos el base64 previo
                  if (form.image_base64) update("image_base64", "");
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Personas / Segmentos</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addPersona}
                    className="text-sm px-3 py-1 bg-gray-900 text-white rounded-lg"
                  >
                    + Agregar
                  </button>
                  <button
                    onClick={() => update("personas", [defaultPersona])}
                    className="text-sm px-3 py-1 border rounded-lg"
                  >
                    Reset a 1 segmento
                  </button>
                </div>
              </div>

              {form.personas.map((p, idx) => (
                <div key={idx} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{p.name}</h4>
                    <button
                      onClick={() => rmPersona(idx)}
                      className="text-xs text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Text
                      label="Nombre"
                      value={p.name}
                      onChange={(v) => {
                        const arr = [...form.personas];
                        arr[idx] = { ...p, name: v };
                        update("personas", arr);
                      }}
                    />
                    <NumberInput
                      label="Edad mín"
                      value={p.age_min}
                      onChange={(v) => {
                        const arr = [...form.personas];
                        const n = v === "" ? 18 : globalThis.Number(v) || 18;
                        arr[idx] = { ...p, age_min: n };
                        update("personas", arr);
                      }}
                    />
                    <NumberInput
                      label="Edad máx"
                      value={p.age_max}
                      onChange={(v) => {
                        const arr = [...form.personas];
                        const n = v === "" ? 65 : globalThis.Number(v) || 65;
                        arr[idx] = { ...p, age_max: n };
                        update("personas", arr);
                      }}
                    />
                  </div>
                  <Tags
                    label="Intereses (Meta)"
                    value={p.interests}
                    onChange={(v) => {
                      const arr = [...form.personas];
                      arr[idx] = { ...p, interests: dedupe(v) };
                      update("personas", arr);
                    }}
                  />
                  <Tags
                    label="Keywords (Google)"
                    value={p.keywords}
                    onChange={(v) => {
                      const arr = [...form.personas];
                      arr[idx] = { ...p, keywords: dedupe(v) };
                      update("personas", arr);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h3 className="font-semibold">Acciones</h3>
            <button
              onClick={submit}
              disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Generando..." : "Generar plan y previews"}
            </button>
            {error && <p className="text-red-600 text-sm whitespace-pre-wrap">{error}</p>}

            {resp && (
              <div className="space-y-5">
                <h3 className="font-semibold">Previsualizaciones</h3>
                <PreviewGoogle card={resp.preview?.google_search_card} />
                <PreviewMeta
                  card={resp.preview?.meta_feed_card}
                  fallbackImg={form.image_url}
                />

                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Plan generado</h3>
                  <button
                    onClick={downloadPlan}
                    className="text-xs px-2 py-1 border rounded-lg"
                  >
                    Descargar plan.json
                  </button>
                </div>

                <textarea
                  readOnly
                  className="w-full h-64 p-3 bg-gray-50 rounded-lg text-xs"
                  value={JSON.stringify(resp.plan ?? {}, null, 2)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function Text({ label, value, onChange, onBlur }) {
  const safe = typeof value === "string" ? value : value == null ? "" : String(value);
  return (
    <label className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <input
        className="w-full border rounded-lg px-3 py-2"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

function NumberInput({ label, value, onChange }) {
  const safe =
    typeof value === "number" && globalThis.Number.isFinite(value)
      ? String(value)
      : value == null
      ? ""
      : String(value);

  const handle = (e) => {
    const raw = e.target.value;
    if (raw === "") return onChange("");
    const n = globalThis.Number(raw);
    onChange(globalThis.Number.isFinite(n) ? n : raw);
  };

  return (
    <label className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <input
        type="number"
        step="any"
        className="w-full border rounded-lg px-3 py-2"
        value={safe}
        onChange={handle}
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Multi({ label, value = [], onChange, options = [] }) {
  const toggle = (o) => {
    const s = new Set(value);
    s.has(o) ? s.delete(o) : s.add(o);
    onChange(Array.from(s));
  };
  return (
    <div className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`px-3 py-1 rounded-full border ${
              value.includes(o) ? "bg-black text-white" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tags({ label, value = [], onChange }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange(dedupe([...value, v]));
    setInput("");
  };
  const rm = (i) => onChange(value.filter((_, idx) => idx !== i));
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <div className="flex gap-2 flex-wrap mb-2">
        {value.map((t, i) => (
          <span
            key={i}
            className="px-2 py-1 rounded-full bg-gray-100 border text-xs flex items-center gap-2"
          >
            {t}
            <button onClick={() => rm(i)} className="text-red-600">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="agregar y presionar Enter o +"
        />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-gray-900 text-white">
          +
        </button>
      </div>
    </div>
  );
}

/* -------- Imagen: subir/URL + preview + base64 -------- */
function ImagePicker({ label, value, onUrlChange, onBase64, onClear }) {
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      const b64 = await toBase64(file);
      onBase64?.(b64, previewUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {value ? (
          <button type="button" onClick={onClear} className="text-xs text-red-600">
            Quitar imagen
          </button>
        ) : null}
      </div>
      {busy && <div className="text-xs text-gray-500 mt-1">Procesando imagen…</div>}
      {value ? (
        <div className="mt-2">
          <img
            src={value}
            alt="preview anuncio"
            className="w-full max-h-56 object-contain border rounded-lg"
          />
        </div>
      ) : null}
    </div>
  );
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/* --------- Previews --------- */
function PreviewGoogle({ card }) {
  if (!card) return null;
  const copy = (txt) => navigator.clipboard?.writeText?.(txt);
  return (
    <div className="border rounded-xl p-4">
      <div className="text-xs text-gray-500">Google · Search (borrador)</div>
      <div className="mt-2 text-blue-700 text-sm break-words flex items-center gap-2">
        <a href={card.url} target="_blank" rel="noreferrer" className="underline">
          {card.url}
        </a>
        <button
          onClick={() => copy(card.url)}
          className="text-[10px] px-2 py-0.5 border rounded"
        >
          Copiar
        </button>
      </div>
      <div className="text-green-700 text-xs">{card.path}</div>
      <div className="mt-1 font-semibold">{card.title}</div>
      <div className="text-gray-700 text-sm">{card.description}</div>
    </div>
  );
}

function PreviewMeta({ card, fallbackImg }) {
  if (!card) return null;
  const img = card.image_url || fallbackImg || "";
  const copy = (txt) => navigator.clipboard?.writeText?.(txt);

  return (
    <div className="border rounded-xl p-4">
      <div className="text-xs text-gray-500">Meta · Feed/Reels (borrador)</div>

      {img ? (
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={img} alt="anuncio" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
          {card.image_prompt || "Imagen del producto"}
        </div>
      )}

      <div className="mt-2 text-sm text-gray-800">{card.primary_text}</div>
      <div className="mt-1 font-semibold">{card.headline}</div>
      <div className="text-gray-600 text-sm">{card.description}</div>
      <button className="mt-2 px-3 py-1 rounded-lg bg-blue-600 text-white text-sm">
        {card.cta}
      </button>

      <div className="mt-1 text-xs text-blue-700 break-words flex items-center gap-2">
        <a href={card.url} target="_blank" rel="noreferrer" className="underline">
          {card.url}
        </a>
        <button
          onClick={() => copy(card.url)}
          className="text-[10px] px-2 py-0.5 border rounded"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
